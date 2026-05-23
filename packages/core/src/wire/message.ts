import { bytesToHex, type Hex, hexToBytes } from "viem";

// Application-layer envelope wrapping a signed raw transaction with optional
// scheduling metadata. Discriminated by a magic byte so a bare raw tx (whose
// first byte is an RLP list prefix >= 0xc0 or an EIP-2718 type byte 0x01/0x02)
// is still accepted unchanged and treated as "submit immediately".
export const SUBMISSION_ENVELOPE_MAGIC = 0xe7;
export const SUBMISSION_ENVELOPE_VERSION = 1;

const FLAG_HAS_SUBMIT_AFTER = 0x01;
const HEADER_BYTES = 3; // magic, version, flags
const SUBMIT_AFTER_BYTES = 8;

export type SubmissionMessage = {
  rawTx: Hex;
  // Unix timestamp in seconds. The ground station submits only once this time
  // has passed. Omitted means submit immediately.
  submitAfter?: number;
};

export function encodeSubmissionMessage(message: SubmissionMessage): Uint8Array {
  const rawTxBytes = hexToBytes(message.rawTx);
  const hasSubmitAfter = typeof message.submitAfter === "number";
  const size = HEADER_BYTES + (hasSubmitAfter ? SUBMIT_AFTER_BYTES : 0) + rawTxBytes.length;
  const out = new Uint8Array(size);
  out[0] = SUBMISSION_ENVELOPE_MAGIC;
  out[1] = SUBMISSION_ENVELOPE_VERSION;
  out[2] = hasSubmitAfter ? FLAG_HAS_SUBMIT_AFTER : 0;
  let offset = HEADER_BYTES;
  if (hasSubmitAfter) {
    new DataView(out.buffer).setBigUint64(offset, BigInt(Math.floor(message.submitAfter as number)), false);
    offset += SUBMIT_AFTER_BYTES;
  }
  out.set(rawTxBytes, offset);
  return out;
}

export function decodeSubmissionMessage(bytes: Uint8Array): SubmissionMessage {
  if (bytes[0] !== SUBMISSION_ENVELOPE_MAGIC) {
    // Bare raw transaction (legacy / un-enveloped payload): submit immediately.
    return { rawTx: bytesToHex(bytes) };
  }
  if (bytes[1] !== SUBMISSION_ENVELOPE_VERSION) {
    throw new Error("Unsupported submission envelope version");
  }
  const flags = bytes[2] ?? 0;
  let offset = HEADER_BYTES;
  let submitAfter: number | undefined;
  if ((flags & FLAG_HAS_SUBMIT_AFTER) !== 0) {
    if (bytes.length < offset + SUBMIT_AFTER_BYTES) {
      throw new Error("Submission envelope missing submitAfter field");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    submitAfter = Number(view.getBigUint64(offset, false));
    offset += SUBMIT_AFTER_BYTES;
  }
  const rawTx = bytesToHex(bytes.slice(offset));
  return submitAfter === undefined ? { rawTx } : { rawTx, submitAfter };
}
