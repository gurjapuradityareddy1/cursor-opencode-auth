import type { Plugin } from "@opencode-ai/plugin";

import { ensureBridgeProcess } from "./lib/bridge.js";
import { ensurePluginShowsVersionInStatus } from "./lib/pluginShim.js";
import { createBridgeTools } from "./tools/bridge.js";
import { createCliTools } from "./tools/cli.js";
import { createCloudTools } from "./tools/cloud.js";

function getCursorAgentBin(): string {
  return (
    process.env.CURSOR_AGENT_BIN ||
    process.env.CURSOR_CLI_BIN ||
    process.env.CURSOR_CLI_PATH ||
    "agent"
  );
}

export const CursorPlugin: Plugin = async ({ client, directory, worktree }) => {
  const agentBin = getCursorAgentBin();
  const cwd = directory || process.cwd();
  const repoRoot = worktree || undefined;

  // Make /status show this plugin version by ensuring a versioned plugin shim exists.
  // OpenCode only shows versions for npm plugins; for local file plugins it displays the file name.
  // This is best-effort and takes effect after restarting OpenCode.
  await ensurePluginShowsVersionInStatus(client).catch(() => undefined);

  // Ensure the Cursor OpenAI-compatible bridge process is running.
  await ensureBridgeProcess(agentBin, cwd);

  return {
    tool: {
      ...createBridgeTools({ agentBin, cwd }),
      ...createCliTools({ agentBin, cwd, repoRoot }),
      ...createCloudTools({ cwd }),
    },
  };
};
