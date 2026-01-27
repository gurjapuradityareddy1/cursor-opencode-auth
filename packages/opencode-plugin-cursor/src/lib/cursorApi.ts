import { Buffer } from "node:buffer";

export type CursorApiAuthStyle = "basic" | "bearer";

function getCursorApiBaseURL(): string {
  return process.env.CURSOR_API_BASE_URL || "https://api.cursor.com";
}

function getCursorApiKey(explicit?: string): string {
  const key = explicit || process.env.CURSOR_API_KEY;
  if (!key) {
    throw new Error(
      "Missing Cursor API key. Set CURSOR_API_KEY or pass apiKey explicitly.",
    );
  }
  return key;
}

function buildAuthHeader(key: string, style: CursorApiAuthStyle): string {
  if (style === "bearer") return `Bearer ${key}`;
  // Basic auth, as documented by Cursor APIs and Cloud Agents API.
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function cursorApiRequest<T>(args: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  apiKey?: string;
  authStyle?: CursorApiAuthStyle;
  baseURL?: string;
  body?: unknown;
  timeoutMs?: number;
}): Promise<T> {
  const baseURL = (args.baseURL || getCursorApiBaseURL()).replace(/\/$/, "");
  const apiKey = getCursorApiKey(args.apiKey);
  const authStyle = args.authStyle ?? "basic";

  const controller = new AbortController();
  const timeout =
    typeof args.timeoutMs === "number" && args.timeoutMs > 0
      ? setTimeout(() => controller.abort(), args.timeoutMs)
      : undefined;

  try {
    const res = await fetch(`${baseURL}${args.path}`, {
      method: args.method,
      headers: {
        Authorization: buildAuthHeader(apiKey, authStyle),
        "Content-Type": "application/json",
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const text = isJson ? JSON.stringify(await res.json()) : await res.text();
      const suffix =
        res.status === 401
          ? " (auth failed: verify CURSOR_API_KEY)"
          : res.status === 429
            ? " (rate limited)"
            : "";
      throw new Error(
        `Cursor API ${args.method} ${args.path} failed: ${res.status} ${res.statusText}${suffix}\n${text}`,
      );
    }

    if (res.status === 204) return undefined as T;
    if (isJson) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
