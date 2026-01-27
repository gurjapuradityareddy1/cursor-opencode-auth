import { tool } from "@opencode-ai/plugin";

import {
  getBridgeBaseURL,
  getBridgeHealthURL,
  isBridgeUp,
  startBridgeDetached,
  stopBridgeByPidFile,
} from "../lib/bridge.js";

export function createBridgeTools(args: { agentBin: string; cwd: string }) {
  return {
    cursor_bridge_status: tool({
      description: "Check whether the local cursor-openai-bridge is reachable (GET /health).",
      args: {},
      async execute() {
        const ok = await isBridgeUp(500);
        return JSON.stringify(
          {
            ok,
            baseURL: getBridgeBaseURL(),
            v1BaseURL: `${getBridgeBaseURL()}/v1`,
            healthURL: getBridgeHealthURL(),
          },
          null,
          2,
        );
      },
    }),

    cursor_bridge_start: tool({
      description:
        "Start the local cursor-openai-bridge as a detached process (if not already running).",
      args: {},
      async execute() {
        if (await isBridgeUp(300)) {
          return JSON.stringify(
            {
              ok: true,
              alreadyRunning: true,
              baseURL: getBridgeBaseURL(),
              v1BaseURL: `${getBridgeBaseURL()}/v1`,
            },
            null,
            2,
          );
        }

        const pid = await startBridgeDetached(args.agentBin, args.cwd);

        // Wait briefly for it to come up.
        const start = Date.now();
        while (Date.now() - start < 5_000) {
          if (await isBridgeUp(300)) {
            return JSON.stringify(
              {
                ok: true,
                pid,
                baseURL: getBridgeBaseURL(),
                v1BaseURL: `${getBridgeBaseURL()}/v1`,
              },
              null,
              2,
            );
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        return JSON.stringify(
          {
            ok: false,
            pid,
            message:
              "Started process but /health did not respond yet. Check logs by running the bridge manually.",
          },
          null,
          2,
        );
      },
    }),

    cursor_bridge_stop: tool({
      description: "Stop the local cursor-openai-bridge using the pid file (best-effort).",
      args: {},
      async execute() {
        const stopped = await stopBridgeByPidFile();
        return JSON.stringify(
          {
            stopped,
            ok: !(await isBridgeUp(300)),
          },
          null,
          2,
        );
      },
    }),
  };
}
