import { buildAndSignSepoliaCall } from "@espresso/core";
import { ReadlineParser, SerialPort } from "serialport";
import type { Hex } from "viem";

const portPath = process.env.FIRMWARE_VERIFY_PORT;
if (!portPath) throw new Error("FIRMWARE_VERIFY_PORT is required");

const privateKey =
  (process.env.FIRMWARE_VERIFY_PRIVATE_KEY as Hex | undefined) ??
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const nonce = Number(process.env.FIRMWARE_VERIFY_NONCE ?? 0);
const to = process.env.FIRMWARE_VERIFY_TO ?? "7E5F4552091A69125d5DfCb7b8C2659029395Bdf";

const expected = await buildAndSignSepoliaCall({
  privateKey,
  nonce,
  to: `0x${to}`,
});

const port = new SerialPort({
  path: portPath,
  baudRate: Number(process.env.SERIAL_BAUD_RATE ?? 115200),
});
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

const received = await new Promise<string>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Timed out waiting for firmware RAW_TX response")), 15000);
  parser.on("data", (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("RAW_TX ")) return;
    clearTimeout(timer);
    resolve(trimmed.slice("RAW_TX ".length));
  });
  port.on("open", () => {
    port.write(`VERIFY_SEPOLIA ${privateKey} ${nonce} ${to}\n`);
  });
  port.on("error", reject);
});

port.close();

if (received !== expected) {
  console.error("Firmware raw tx mismatch");
  console.error({ expected, received });
  process.exit(1);
}

console.log("Firmware raw tx matches core reference");
console.log(received);
