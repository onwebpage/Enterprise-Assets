---
name: Imported project setup
description: Imported OmniERP workspaces may contain artifact metadata without registered managed workflows.
---

Imported workspaces can have artifact directories and configured legacy workflows without any artifacts registered in the runtime. Check the live artifact/workflow state before assuming managed artifact names; preserve working imported workflows rather than creating duplicate artifacts.

The app's configured database secret can be different from the database exposed through the platform SQL helper. Verify the app database through the project's own connection before judging schema state. If Drizzle push proposes dropping existing admin tables, stop and use the repository's idempotent SQL bootstrap/migrations instead.

**Why:** The filesystem, artifact registry, and workflow registry are not guaranteed to be synchronized after import. Guessing managed names can fail even when the imported preview is already serving.

**How to apply:** Check `listArtifacts()` and the live workflow list before restarting. If no artifact is registered but existing workflows serve the imported app, use those exact workflow names and avoid `createArtifact()` or duplicate workflow registration.