import { readFile } from "node:fs/promises";
import * as path from "node:path";

import { tool } from "@opencode-ai/plugin";

import { cursorApiRequest } from "../lib/cursorApi.js";
import { toBase64 } from "../lib/base64.js";

export function createCloudTools(args: { cwd: string }) {
  return {
    cursor_cloud_models: tool({
      description: "List recommended models for Cursor Cloud Agents (GET /v0/models).",
      args: {
        apiKey: tool.schema
          .string()
          .optional()
          .describe("Cursor API key (optional; defaults to CURSOR_API_KEY)"),
        authStyle: tool.schema
          .enum(["basic", "bearer"])
          .optional()
          .describe("Auth style (default: basic)")
          .default("basic"),
        baseURL: tool.schema
          .string()
          .optional()
          .describe("Override base URL (default: https://api.cursor.com)"),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest<{ models: string[] }>({
          method: "GET",
          path: "/v0/models",
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_launch_agent: tool({
      description: "Launch a Cursor Cloud Agent (POST /v0/agents). Returns agent id + URLs.",
      args: {
        apiKey: tool.schema
          .string()
          .optional()
          .describe("Cursor API key (optional; defaults to CURSOR_API_KEY)"),
        authStyle: tool.schema
          .enum(["basic", "bearer"])
          .optional()
          .describe("Auth style (default: basic)")
          .default("basic"),
        baseURL: tool.schema
          .string()
          .optional()
          .describe("Override base URL (default: https://api.cursor.com)"),
        prompt: tool.schema.string().describe("Agent prompt text"),
        images: tool.schema
          .array(
            tool.schema.object({
              path: tool.schema.string().optional(),
              data: tool.schema.string().optional(),
              width: tool.schema.number().int().positive().optional(),
              height: tool.schema.number().int().positive().optional(),
            }),
          )
          .optional()
          .describe("Optional images. Provide either {data: base64} or {path: ./file.png}."),
        model: tool.schema
          .string()
          .optional()
          .describe("Optional model name (otherwise Cursor auto-selects)"),
        repository: tool.schema
          .string()
          .optional()
          .describe(
            "Git repository URL (required unless prUrl is provided), e.g. https://github.com/org/repo",
          ),
        ref: tool.schema
          .string()
          .optional()
          .describe("Git ref (branch/tag/sha), e.g. main"),
        prUrl: tool.schema
          .string()
          .optional()
          .describe("GitHub PR URL (optional; if set, repository/ref ignored)"),
        target: tool.schema
          .object({
            autoCreatePr: tool.schema.boolean().optional(),
            openAsCursorGithubApp: tool.schema.boolean().optional(),
            skipReviewerRequest: tool.schema.boolean().optional(),
            branchName: tool.schema.string().optional(),
            autoBranch: tool.schema.boolean().optional(),
          })
          .optional()
          .describe("Optional target options"),
        webhook: tool.schema
          .object({
            url: tool.schema.string(),
            secret: tool.schema.string().optional(),
          })
          .optional()
          .describe("Optional webhook config"),
      },
      async execute(toolArgs) {
        const images = toolArgs.images
          ? await Promise.all(
              toolArgs.images.map(async (img) => {
                if (img.data) {
                  return {
                    data: img.data,
                    dimension:
                      img.width && img.height
                        ? { width: img.width, height: img.height }
                        : undefined,
                  };
                }

                if (!img.path) {
                  throw new Error("Each image must include either data (base64) or path.");
                }

                const buf = await readFile(path.resolve(args.cwd, img.path));
                return {
                  data: toBase64(buf),
                  dimension:
                    img.width && img.height
                      ? { width: img.width, height: img.height }
                      : undefined,
                };
              }),
            )
          : undefined;

        const body: any = {
          prompt: {
            text: toolArgs.prompt,
            ...(images ? { images } : {}),
          },
          source: {},
        };

        if (toolArgs.model) body.model = toolArgs.model;
        if (toolArgs.target) body.target = toolArgs.target;
        if (toolArgs.webhook) body.webhook = toolArgs.webhook;

        if (toolArgs.prUrl) {
          body.source.prUrl = toolArgs.prUrl;
        } else {
          if (!toolArgs.repository) {
            throw new Error("repository is required unless prUrl is provided");
          }
          body.source.repository = toolArgs.repository;
          if (toolArgs.ref) body.source.ref = toolArgs.ref;
        }

        const data = await cursorApiRequest({
          method: "POST",
          path: "/v0/agents",
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          body,
          timeoutMs: 120_000,
        });

        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_agent: tool({
      description: "Get a Cursor Cloud Agent status (GET /v0/agents/{id}).",
      args: {
        id: tool.schema.string().describe("Agent id (e.g. bc_abc123)"),
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "GET",
          path: `/v0/agents/${encodeURIComponent(toolArgs.id)}`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_conversation: tool({
      description: "Fetch a Cursor Cloud Agent conversation (GET /v0/agents/{id}/conversation).",
      args: {
        id: tool.schema.string().describe("Agent id (e.g. bc_abc123)"),
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "GET",
          path: `/v0/agents/${encodeURIComponent(toolArgs.id)}/conversation`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_followup: tool({
      description: "Send a follow-up to a Cursor Cloud Agent (POST /v0/agents/{id}/followup).",
      args: {
        id: tool.schema.string().describe("Agent id (e.g. bc_abc123)"),
        prompt: tool.schema.string().describe("Follow-up prompt text"),
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "POST",
          path: `/v0/agents/${encodeURIComponent(toolArgs.id)}/followup`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          body: { prompt: { text: toolArgs.prompt } },
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_stop: tool({
      description: "Stop a Cursor Cloud Agent (POST /v0/agents/{id}/stop).",
      args: {
        id: tool.schema.string().describe("Agent id (e.g. bc_abc123)"),
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "POST",
          path: `/v0/agents/${encodeURIComponent(toolArgs.id)}/stop`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_delete: tool({
      description: "Delete a Cursor Cloud Agent (DELETE /v0/agents/{id}). Permanent.",
      args: {
        id: tool.schema.string().describe("Agent id (e.g. bc_abc123)"),
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "DELETE",
          path: `/v0/agents/${encodeURIComponent(toolArgs.id)}`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_me: tool({
      description: "Get API key info (GET /v0/me).",
      args: {
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "GET",
          path: "/v0/me",
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_agents: tool({
      description: "List Cursor Cloud Agents (GET /v0/agents).",
      args: {
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
        limit: tool.schema
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Max results (default: 20, max: 100)"),
        cursor: tool.schema
          .string()
          .optional()
          .describe("Pagination cursor from prior response"),
        prUrl: tool.schema.string().optional().describe("Filter agents by PR URL"),
      },
      async execute(toolArgs) {
        const params = new URLSearchParams();
        if (toolArgs.limit) params.set("limit", String(toolArgs.limit));
        if (toolArgs.cursor) params.set("cursor", toolArgs.cursor);
        if (toolArgs.prUrl) params.set("prUrl", toolArgs.prUrl);

        const data = await cursorApiRequest({
          method: "GET",
          path: `/v0/agents${params.size ? `?${params.toString()}` : ""}`,
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 60_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),

    cursor_cloud_repositories: tool({
      description:
        "List GitHub repositories available to Cursor Cloud Agents (GET /v0/repositories). Strict rate limits.",
      args: {
        apiKey: tool.schema.string().optional(),
        authStyle: tool.schema.enum(["basic", "bearer"]).optional().default("basic"),
        baseURL: tool.schema.string().optional(),
      },
      async execute(toolArgs) {
        const data = await cursorApiRequest({
          method: "GET",
          path: "/v0/repositories",
          apiKey: toolArgs.apiKey,
          authStyle: toolArgs.authStyle,
          baseURL: toolArgs.baseURL,
          timeoutMs: 120_000,
        });
        return JSON.stringify(data, null, 2);
      },
    }),
  };
}
