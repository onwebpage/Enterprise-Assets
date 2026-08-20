---
name: Imported project setup
description: Imported OmniERP workspaces may contain artifact metadata without registered managed workflows.
---

Imported workspaces can have valid `.replit-artifact/artifact.toml` files while the runtime still reports no registered artifact workflows. In that case, configure minimal named workflows directly using the ports declared by the artifact metadata.

**Why:** Restarting the expected managed workflow names fails even though the artifact files exist, so setup otherwise appears complete but the preview never starts.

**How to apply:** Check the live workflow list before restarting; if the managed names are absent, register only the existing frontend and API commands with explicit `PORT` values.