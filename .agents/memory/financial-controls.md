---
name: Financial Controls
description: Durable validation and audit-trail rules for the Finance control register.
---

Financial control runs are an audit trail: pending and in-progress runs must remain pending, while completed and waived runs must record a final result. A reviewer must be a different active user from the performer, and completed/waived runs and resolved exceptions are retained rather than deleted.

**Why:** Control execution evidence loses its governance value if a run can be finalized without an outcome, reviewed by the same person who performed it, or silently removed after completion.

**How to apply:** Preserve these invariants in API validation and business logic when extending Financial Controls; validate all date inputs as real calendar dates before writing them.