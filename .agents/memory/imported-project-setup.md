---
name: Imported project setup
description: Imported OmniERP workspaces may contain artifact metadata without registered managed workflows.
---

Imported workspaces can have artifact directories and configured legacy workflows without any artifacts registered in the runtime. Check the live artifact/workflow state before assuming managed artifact names; preserve working imported workflows rather than creating duplicate artifacts. When managed workflows register later, stop legacy processes before restarting the managed services or they can compete for the same port.

The app's configured database secret can be different from the database exposed through the platform SQL helper. Verify the app database through the project's own connection before judging schema state. If Drizzle push proposes dropping existing admin tables, stop and use the repository's idempotent SQL bootstrap/migrations instead. Imported artifact metadata can also expect a different preview port than the legacy workflow; align the workflow port through validated .replit replacement when the proxy returns 502 despite a healthy localhost server.

**Why:** The filesystem, artifact registry, and workflow registry are not guaranteed to be synchronized after import. Guessing managed names can fail even when the imported preview is already serving.

**How to apply:** Check `listArtifacts()` and the live workflow list before restarting. If no artifact is registered but existing workflows serve the imported app, use those exact workflow names and avoid `createArtifact()` or duplicate workflow registration. If artifact services appear later, stop the old same-port workflows and use the managed names.