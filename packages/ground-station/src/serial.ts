import type { loadEspressoEnv } from "@espresso/core";
import { ReadlineParser, SerialPort } from "serialport";
import type { Hex } from "viem";
import { ingestFrameHex } from "./app.js";

export function startSerialIngest(env: ReturnType<typeof loadEspressoEnv>) {
  if (!env.SERIAL_PORT_PATH) return undefined;

  const port = new SerialPort({
    path: env.SERIAL_PORT_PATH,
    baudRate: env.SERIAL_BAUD_RATE,
  });
  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", (line: string) => {
    const frameHex = line.trim();
    if (!frameHex) return;
    void ingestFrameHex(frameHex as Hex, env).catch((error) => {
      console.error("Serial ingest failed", error);
    });
  });

  port.on("open", () => {
    console.log(`Serial ingest listening on ${env.SERIAL_PORT_PATH} at ${env.SERIAL_BAUD_RATE} baud`);
  });

  return port;
}
