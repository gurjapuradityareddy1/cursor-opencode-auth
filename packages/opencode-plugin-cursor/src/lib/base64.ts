import { Buffer } from "node:buffer";

export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}
