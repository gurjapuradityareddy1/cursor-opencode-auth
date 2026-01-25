# Security Notes

This project intentionally uses only *documented* Cursor surfaces:

- Cursor CLI (`agent`)
- Cursor Cloud Agents API (`https://api.cursor.com/v0/...`)

It does not reverse-engineer private Cursor endpoints.

## Cursor CLI risks

- Cursor CLI can read your repository and run shell commands depending on your Cursor CLI permissions.
- In print mode, `--force` enables file edits without confirmation.

Mitigation:

- Configure Cursor CLI permissions (`~/.cursor/cli-config.json` or `<project>/.cursor/cli.json`) to allow only what you need.
- Deny reads of sensitive files like `.env*`.

## OpenCode plugin tool risks

- OpenCode custom tools run on your machine.
- Even if OpenCode permissions are strict, a buggy/malicious plugin could still execute code.

Mitigation:

- Only install plugins you trust.
- Gate tool usage in OpenCode with `permission` rules (require `ask`).

## cursor_cli_patch behavior

`cursor_cli_patch`:

- Creates a temporary `git worktree` directory.
- Runs Cursor CLI inside it with `--force`.
- Produces a `git diff` patch.
- Removes the temp worktree (may use `git worktree remove --force` on the temp directory).

This is designed to prevent Cursor from editing your main working tree directly.

## Cloud Agents risks

Cloud Agents run in a remote Ubuntu environment with internet access and auto-run terminal commands.

Mitigation:

- Only use Cloud Agents on repos where remote execution is acceptable.
- Avoid passing secrets in prompts.
- Prefer using Cursor’s Cloud Agent Secrets management (Cursor Settings → Cloud Agents → Secrets) instead of committing `.env` files.
