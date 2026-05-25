import { buildAndSignSepoliaCall, chunkHexPayload } from "@espresso/core";
import type { Hex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, ingestFrameHex, submissions } from "../src/app.js";

const privateKey = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;
const account = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";
const txHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
const auditEntityKey = "0x2222222222222222222222222222222222222222222222222222222222222222";

afterEach(() => {
  vi.restoreAllMocks();
  submissions.clear();
});

function mockRpc() {
  const methods: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as { method: string };
    methods.push(request.method);
    if (request.method === "eth_sendRawTransaction") {
      return Response.json({ jsonrpc: "2.0", id: 1, result: txHash });
    }
    if (request.method === "eth_getTransactionReceipt") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          transactionHash: txHash,
          blockHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
          blockNumber: "0x1",
          contractAddress: null,
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x1",
          from: account,
          gasUsed: "0x5208",
          logs: [
            {
              address: "0x00000000000000000000000000000061726b6976",
              blockHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
              blockNumber: "0x1",
              data: "0x",
              logIndex: "0x0",
              removed: false,
              topics: ["0xce4b4ad6891d716d0b1fba2b4aeb05ec20edadb01df512263d0dde423736bbb9", auditEntityKey],
              transactionHash: txHash,
              transactionIndex: "0x0",
            },
          ],
          logsBloom: `0x${"0".repeat(512)}`,
          status: "0x1",
          to: "0x00000000000000000000000000000061726b6976",
          transactionIndex: "0x0",
          type: "0x0",
        },
      });
    }
    if (request.method === "arkiv_query") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: [
            {
              key: auditEntityKey,
              value: "0x7b7d", // hex of "{}"
              contentType: "application/json",
              stringAttributes: [],
              numericAttributes: [],
            },
          ],
          cursor: undefined,
          blockNumber: "0x1",
        },
      });
    }
    return Response.json({ jsonrpc: "2.0", id: 1, result: "0x1" });
  });
  return methods;
}

describe("ground station app", () => {
  it("does not accept raw transactions over HTTP", async () => {
    const app = createApp();
    const response = await app.request("/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rawTx: "0x00" }),
    });
    expect(response.status).toBe(404);
  });

  it("routes, submits, and audits a frame-ingested raw tx", async () => {
    const methods = mockRpc();
    const rawTx = await buildAndSignSepoliaCall({
      privateKey,
      nonce: 0,
      to: account,
    });
    const env = {
      SEPOLIA_RPC_URL: "https://rpc.test/sepolia",
      ARKIV_RPC_URL: "https://rpc.test/arkiv",
      ARKIV_WS_URL: "wss://rpc.test/arkiv/ws",
      DEVICE_PRIVATE_KEY: privateKey,
      GROUND_STATION_PRIVATE_KEY: privateKey,
      GROUND_STATION_PORT: 8787,
      SERIAL_BAUD_RATE: 115200,
      AUDIT_EXPIRES_DAYS: 30,
    };

    let submission: Awaited<ReturnType<typeof ingestFrameHex>>;
    for (const frame of chunkHexPayload(rawTx, 1234, 96)) {
      submission = await ingestFrameHex(`0x${Buffer.from(frame).toString("hex")}`, env);
    }

    expect(submission?.status).toBe("audited");
    expect(submission?.from).toBe(account);
    expect(submission?.auditEntityKey).toBe(auditEntityKey);
    expect(methods.filter((method) => method === "eth_sendRawTransaction")).toHaveLength(2);
  });

  it("returns local and Arkiv submissions", async () => {
    mockRpc();
    const app = createApp();
    const response = await app.request("/submissions");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.arkiv).toEqual([{ key: auditEntityKey, value: "{}" }]);
  });
});
