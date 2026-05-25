import {
  type AuditEntity,
  chainForId,
  changeEntityOwner,
  createDeviceEntity,
  createReceiptEntity,
  createSubmissionEntity,
  decodeSubmissionMessage,
  extendEntityExpiry,
  findDeviceEntityByAddress,
  FrameReassembler,
  loadEspressoEnv,
  parseRawTransaction,
  queryAuditEntities,
  queryDeviceEntities,
  queryQueuedSubmissions,
  queryReceiptsByOwner,
  type ReceiptStatus,
  recoverRawTransactionSender,
  requireEnvPrivateKey,
  rpcUrlForChainId,
  type SubmissionEntityStatus,
  updateSubmissionEntity,
} from "@espresso/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { createPublicClient, type Hex, hexToBytes, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type GroundStationBindings = {
  Variables: {
    env: ReturnType<typeof loadEspressoEnv>;
  };
};

export type SubmissionStatus = "received" | "queued" | "submitted" | "confirmed" | "failed";

export type Submission = {
  id: string;
  rawTx: Hex;
  txHash: Hex;
  from: Hex;
  chainId: number;
  status: SubmissionStatus;
  createdAt: string;
  // Unix seconds the device requested the tx be held until, if scheduled.
  submitAfter?: number;
  // Foreign key to the device entity that signed this tx.
  deviceKey?: Hex;
  auditEntityKey?: Hex;
  auditTxHash?: Hex;
  // Terminal receipt entity, owned by the submitting user.
  receiptEntityKey?: Hex;
  error?: string;
};

export const submissions = new Map<string, Submission>();
export const serialReassembler = new FrameReassembler();
const listeners = new Set<(submission: Submission) => void>();
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

// setTimeout truncates delays beyond a 32-bit ms range, so re-arm in chunks.
const MAX_TIMEOUT_MS = 2_147_483_647;

function publishSubmission(submission: Submission): void {
  for (const listener of listeners) listener(submission);
}

function scheduleSubmission(submission: Submission, env: ReturnType<typeof loadEspressoEnv>): void {
  const arm = () => {
    const remaining = (submission.submitAfter ?? 0) * 1000 - Date.now();
    if (remaining > MAX_TIMEOUT_MS) {
      scheduledTimers.set(submission.id, setTimeout(arm, MAX_TIMEOUT_MS));
      return;
    }
    scheduledTimers.set(
      submission.id,
      setTimeout(
        () => {
          scheduledTimers.delete(submission.id);
          void runSubmission(submission, env);
        },
        Math.max(0, remaining),
      ),
    );
  };
  arm();
}

// Cancels any pending scheduled submissions. Intended for tests / shutdown.
export function clearScheduledSubmissions(): void {
  for (const timer of scheduledTimers.values()) clearTimeout(timer);
  scheduledTimers.clear();
}

const deviceKeyCache = new Map<string, Hex>();

// Resets the device lookup cache. Intended for tests.
export function clearDeviceCache(): void {
  deviceKeyCache.clear();
}

function stationAddress(env: ReturnType<typeof loadEspressoEnv>): Hex {
  return privateKeyToAccount(requireEnvPrivateKey(env, "GROUND_STATION_PRIVATE_KEY") as Hex).address;
}

// Returns the device entity key for a sender, creating the device entity on first
// sight. Failures don't block the relay — the submission just goes unlinked.
async function getOrCreateDeviceKey(
  address: Hex,
  env: ReturnType<typeof loadEspressoEnv>,
): Promise<Hex | undefined> {
  const cacheId = address.toLowerCase();
  const cached = deviceKeyCache.get(cacheId);
  if (cached) return cached;
  try {
    const trustedCreator = stationAddress(env);
    let entityKey = await findDeviceEntityByAddress(address, {
      trustedCreator,
      rpcUrl: env.ARKIV_RPC_URL,
    });
    if (!entityKey) {
      const result = await createDeviceEntity(
        { address, label: `device-${address.slice(0, 8)}`, firstSeenTs: new Date().toISOString() },
        stationWriteOptions(env),
      );
      entityKey = result.entityKey;
    }
    deviceKeyCache.set(cacheId, entityKey);
    return entityKey;
  } catch {
    return undefined;
  }
}

function chainClient(chainId: number, env: ReturnType<typeof loadEspressoEnv>) {
  return createPublicClient({
    chain: chainForId(chainId),
    transport: http(
      rpcUrlForChainId(chainId, {
        sepoliaRpcUrl: env.SEPOLIA_RPC_URL,
        arkivRpcUrl: env.ARKIV_RPC_URL,
      }),
    ),
  });
}

function stationWriteOptions(env: ReturnType<typeof loadEspressoEnv>) {
  return {
    rpcUrl: env.ARKIV_RPC_URL,
    privateKey: requireEnvPrivateKey(env, "GROUND_STATION_PRIVATE_KEY") as Hex,
    expiresInDays: env.AUDIT_EXPIRES_DAYS,
  };
}

function auditFromSubmission(submission: Submission, status: SubmissionEntityStatus): AuditEntity {
  return {
    txHash: submission.txHash,
    from: submission.from,
    chainId: submission.chainId,
    rawTx: submission.rawTx,
    ts: submission.createdAt,
    status,
    ...(submission.submitAfter !== undefined ? { submitAfter: submission.submitAfter } : {}),
    ...(submission.deviceKey !== undefined ? { deviceKey: submission.deviceKey } : {}),
  };
}

// Writes (first time) or updates (subsequent transitions) the submission's Arkiv
// entity, so a queued tx persists on Arkiv and the same entity carries it through
// to submitted/failed instead of spawning duplicates.
async function recordSubmissionEntity(
  submission: Submission,
  env: ReturnType<typeof loadEspressoEnv>,
  status: SubmissionEntityStatus,
): Promise<void> {
  const audit = auditFromSubmission(submission, status);
  const options = stationWriteOptions(env);
  if (submission.auditEntityKey) {
    const result = await updateSubmissionEntity(submission.auditEntityKey, audit, options);
    submission.auditTxHash = result.txHash;
  } else {
    const result = await createSubmissionEntity(audit, options);
    submission.auditEntityKey = result.entityKey;
    submission.auditTxHash = result.txHash;
  }
}

// Mints a terminal receipt entity and hands ownership to the user who signed the
// tx — $creator stays the station (immutable attribution), $owner becomes the
// user, so the user owns their data. Best effort; failures don't break the relay.
async function finalizeReceipt(
  submission: Submission,
  env: ReturnType<typeof loadEspressoEnv>,
  status: ReceiptStatus,
  blockNumber?: number,
): Promise<void> {
  if (!submission.auditEntityKey) return;
  try {
    const options = stationWriteOptions(env);
    const result = await createReceiptEntity(
      {
        txHash: submission.txHash,
        from: submission.from,
        chainId: submission.chainId,
        status,
        ts: new Date().toISOString(),
        submissionKey: submission.auditEntityKey,
        ...(blockNumber !== undefined ? { blockNumber } : {}),
        ...(submission.deviceKey !== undefined ? { deviceKey: submission.deviceKey } : {}),
      },
      options,
    );
    submission.receiptEntityKey = result.entityKey;
    await changeEntityOwner(result.entityKey, submission.from, options);
  } catch {
    // Arkiv unreachable; the submission entity already records the outcome.
  }
}

// On failure: extend the submission entity's lifespan so the failed record sticks
// around for investigation, and mint a failure receipt for the user.
async function onSubmissionFailure(
  submission: Submission,
  env: ReturnType<typeof loadEspressoEnv>,
): Promise<void> {
  if (submission.auditEntityKey) {
    try {
      await extendEntityExpiry(submission.auditEntityKey, 90, stationWriteOptions(env));
    } catch {
      // best effort
    }
  }
  await finalizeReceipt(submission, env, "failed");
}

async function runSubmission(
  submission: Submission,
  env: ReturnType<typeof loadEspressoEnv>,
): Promise<Submission> {
  try {
    const client = chainClient(submission.chainId, env);
    submission.txHash = await client.sendRawTransaction({ serializedTransaction: submission.rawTx });
    submission.status = "submitted";
    publishSubmission(submission);
    await recordSubmissionEntity(submission, env, "submitted");

    // Wait for the tx to land, then update the same entity in place.
    const receipt = await client.waitForTransactionReceipt({ hash: submission.txHash });
    if (receipt.status === "success") {
      submission.status = "confirmed";
      publishSubmission(submission);
      await recordSubmissionEntity(submission, env, "confirmed");
      await finalizeReceipt(submission, env, "confirmed", Number(receipt.blockNumber));
    } else {
      submission.status = "failed";
      submission.error = "Transaction reverted on chain";
      publishSubmission(submission);
      await recordSubmissionEntity(submission, env, "failed");
      await onSubmissionFailure(submission, env);
    }
    publishSubmission(submission);
    return submission;
  } catch (error) {
    submission.status = "failed";
    submission.error = error instanceof Error ? error.message : "Unknown submit error";
    publishSubmission(submission);
    // Best effort: mark the durable entity failed so the trail reflects reality.
    try {
      await recordSubmissionEntity(submission, env, "failed");
    } catch {
      // Arkiv unreachable; the in-memory submission already records the failure.
    }
    await onSubmissionFailure(submission, env);
    publishSubmission(submission);
    return submission;
  }
}

export async function ingestRawTransaction(
  rawTx: Hex,
  env: ReturnType<typeof loadEspressoEnv>,
  options: { submitAfter?: number } = {},
): Promise<Submission> {
  const parsed = parseRawTransaction(rawTx);
  if (!parsed.chainId) throw new HTTPException(400, { message: "Signed transaction must include chainId" });

  const from = (await recoverRawTransactionSender(rawTx)) as Hex;
  const txHash = keccak256(rawTx);
  const deviceKey = await getOrCreateDeviceKey(from, env);
  const submission: Submission = {
    id: txHash,
    rawTx,
    txHash,
    from,
    chainId: Number(parsed.chainId),
    status: "received",
    createdAt: new Date().toISOString(),
    ...(deviceKey !== undefined ? { deviceKey } : {}),
    ...(options.submitAfter !== undefined ? { submitAfter: options.submitAfter } : {}),
  };
  submissions.set(txHash, submission);
  publishSubmission(submission);

  if (options.submitAfter && options.submitAfter * 1000 > Date.now()) {
    submission.status = "queued";
    // Persist the signed tx on Arkiv before arming the timer, so the queued work
    // survives a ground station restart and is queryable by anyone.
    try {
      await recordSubmissionEntity(submission, env, "queued");
    } catch (error) {
      submission.error = error instanceof Error ? error.message : "Arkiv queue write failed";
    }
    publishSubmission(submission);
    scheduleSubmission(submission, env);
    return submission;
  }

  return runSubmission(submission, env);
}

// On boot, reload any still-queued submissions from Arkiv and re-arm their timers
// (or submit immediately if their time already passed). Only entities created by
// this station's own wallet are trusted (createdBy filter in the query).
export async function recoverQueuedSubmissions(
  env: ReturnType<typeof loadEspressoEnv>,
): Promise<Submission[]> {
  const recovered = await queryQueuedSubmissions({
    trustedCreator: stationAddress(env),
    rpcUrl: env.ARKIV_RPC_URL,
  });

  const restored: Submission[] = [];
  for (const { entityKey, audit } of recovered) {
    if (submissions.has(audit.txHash)) continue;
    const submission: Submission = {
      id: audit.txHash,
      rawTx: audit.rawTx as Hex,
      txHash: audit.txHash as Hex,
      from: audit.from as Hex,
      chainId: audit.chainId,
      status: "queued",
      createdAt: audit.ts,
      auditEntityKey: entityKey,
      ...(audit.deviceKey !== undefined ? { deviceKey: audit.deviceKey as Hex } : {}),
      ...(audit.submitAfter !== undefined ? { submitAfter: audit.submitAfter } : {}),
    };
    submissions.set(submission.id, submission);
    publishSubmission(submission);
    if (submission.submitAfter && submission.submitAfter * 1000 > Date.now()) {
      scheduleSubmission(submission, env);
    } else {
      void runSubmission(submission, env);
    }
    restored.push(submission);
  }
  return restored;
}

export async function ingestFrameHex(
  frameHex: Hex,
  env: ReturnType<typeof loadEspressoEnv>,
): Promise<Submission | undefined> {
  const message = serialReassembler.push(hexToBytes(frameHex));
  if (!message) return undefined;
  const decoded = decodeSubmissionMessage(message.payload);
  return ingestRawTransaction(
    decoded.rawTx,
    env,
    decoded.submitAfter !== undefined ? { submitAfter: decoded.submitAfter } : {},
  );
}

export function createApp(env = loadEspressoEnv()) {
  const app = new Hono<GroundStationBindings>();

  app.use(async (c, next) => {
    c.set("env", env);
    await next();
  });

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "espresso-ground-station",
      time: new Date().toISOString(),
    }),
  );

  app.get("/submissions", async (c) => {
    const query = c.req.query("query") ?? 'project="espresso-ns05-arkiv" && kind="submission"';
    const includeArkiv = c.req.query("arkiv") !== "false";
    const local = Array.from(submissions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!includeArkiv) return c.json({ local, arkiv: [] });

    try {
      const arkiv = await queryAuditEntities(query, { rpcUrl: c.get("env").ARKIV_RPC_URL });
      return c.json({ local, arkiv });
    } catch (error) {
      return c.json(
        {
          local,
          arkiv: [],
          arkivError: error instanceof Error ? error.message : "Unknown Arkiv query error",
        },
        502,
      );
    }
  });

  app.get("/devices", async (c) => {
    try {
      const devices = await queryDeviceEntities({
        trustedCreator: stationAddress(c.get("env")),
        rpcUrl: c.get("env").ARKIV_RPC_URL,
      });
      return c.json({ devices });
    } catch (error) {
      return c.json(
        { devices: [], error: error instanceof Error ? error.message : "Unknown Arkiv query error" },
        502,
      );
    }
  });

  app.get("/receipts", async (c) => {
    const owner = c.req.query("owner");
    if (!owner) return c.json({ error: "owner query param required" }, 400);
    try {
      const receipts = await queryReceiptsByOwner(owner as Hex, { rpcUrl: c.get("env").ARKIV_RPC_URL });
      return c.json({ receipts });
    } catch (error) {
      return c.json(
        { receipts: [], error: error instanceof Error ? error.message : "Unknown Arkiv query error" },
        502,
      );
    }
  });

  app.get("/events", (c) =>
    streamSSE(c, async (stream) => {
      let id = 0;
      await stream.writeSSE({
        event: "ready",
        data: JSON.stringify({ ok: true }),
        id: String(id),
      });
      const listener = (submission: Submission) => {
        id += 1;
        void stream.writeSSE({
          event: "submission",
          data: JSON.stringify(submission),
          id: String(id),
        });
      };
      listeners.add(listener);
      stream.onAbort(() => {
        listeners.delete(listener);
      });
      while (!stream.aborted) {
        await stream.sleep(30_000);
        id += 1;
        await stream.writeSSE({ event: "ping", data: "{}", id: String(id) });
      }
    }),
  );

  return app;
}
