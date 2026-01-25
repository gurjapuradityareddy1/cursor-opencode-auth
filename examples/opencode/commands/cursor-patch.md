---
description: Run Cursor and apply a patch
agent: build
---
Use the `cursor_cli_patch` tool with the following task prompt:

$ARGUMENTS

Then extract the diff inside the `<patch>` tag and apply it to the workspace using OpenCode's `patch` tool.

If the patch is empty, explain why and stop.
