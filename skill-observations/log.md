# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED = skill updated/created | DECLINED = user decided not to pursue

---

### Observation 1: A test suite that never loads the artifact can't prove the artifact works
**Date:** 2026-06-19
**Session context:** Fixed a client-side web app where the batch queue was lost on reload. The project's `npm test` extracts and tests only the pure parser from the HTML; it never loads the page, so queue/persistence/UI bugs (and a prior silent file truncation) stayed invisible while the suite reported all-green.
**Skill:** superpowers:verification-before-completion
**Type:** open-source
**Phase/Area:** Verification / "evidence before completion"

**Issue:** The green regression suite gave false confidence: it could not catch an entire class of runtime bugs because it tested extracted logic, not the running artifact. The actual fix was only trustworthy after adding (a) pure unit tests for the new logic and (b) an end-to-end simulation that loaded the *real* functions out of the file against an in-memory store, plus a full-script parse check.

**Suggested improvement:** Add a check to verification-before-completion: identify what layer the existing tests actually exercise, and if they don't load/run the deliverable artifact itself, add a smoke/integration/simulation layer before claiming done. "All tests pass" is necessary, not sufficient.

**Principle:** Confidence should scale with how close the test is to the real artifact. A unit/regression suite that operates on extracted or mocked logic must be paired with at least one check that exercises the shipping artifact end to end, or whole bug classes go unverified.

### Observation 2: On an unreliable write target, author in a sandbox copy and deliver with verify-and-repair
**Date:** 2026-06-19
**Session context:** Edits to repo files on a cloud-synced (OneDrive) mount silently truncated a freshly written file — the editor's view showed it complete while the runtime view was cut mid-line, so tests failed on code that "looked" correct. This is a recurring hazard in this environment.
**Skill:** New skill candidate: working-with-unreliable-filesystems
**Type:** open-source
**Phase/Area:** Environment / file delivery

**Issue:** Iterating directly against the flaky mount produced confusing failures (truncated reads, divergence between the editor view and the execution view). Progress only became reliable after switching to a sandbox-native working copy for all authoring/testing, then delivering to the real location with a sha256 verify-and-repair loop and re-running the gate in the real folder.

**Suggested improvement:** Capture the pattern: (1) detect divergence between write view and execution view early; (2) move authoring/testing to a reliable local path; (3) deliver with content-hash verification and bounded retry; (4) re-run the acceptance gate in the real destination, not just the sandbox.

**Principle:** When the destination filesystem can silently corrupt or lag writes, separate "where you author/test" from "where you deliver," and bridge them with hash-verified, idempotent delivery. Never trust a single write to a known-flaky target; verify the bytes landed.

### Observation 3: Brainstorming re-litigated decisions already locked in an existing spec

**Date:** 2026-06-19
**Session context:** User re-ran the same "integrate FedEx API / auto-print labels" brainstorming prompt that had already produced an approved design spec and a Phase 1 plan earlier the same day (both in docs/superpowers/). The agent ran npm test and asked three clarifying questions (backend, printer type, FedEx account) before reading those existing docs. Two of the three answers exactly matched decisions already "locked" in the spec; only one (account in-hand) advanced an open question.
**Skill:** superpowers:brainstorming
**Type:** open-source
**Phase/Area:** Checklist step 1 (explore project context) / clarifying-questions phase

**Issue:** Clarifying questions were asked before checking whether a prior design already answered them. The project stores specs under a predictable path (docs/superpowers/specs/) and CLAUDE.md even named the existing spec, but the questions went out first, partly duplicating settled work.

**Suggested improvement:** In the "explore project context" step, before asking any clarifying question, scan the spec/plan directory (and any working-memory file) for an existing design on the same topic. If one exists, switch from "design from scratch" to "confirm/refine the existing design and identify the genuine next step" — and only ask questions that the spec leaves genuinely open.

**Principle:** Brainstorming should first detect prior art for the same feature and resume from it, not restart. Re-asking questions a user already answered erodes trust and burns turns; the highest-value move when a design exists is to surface where it stands and what the real open fork is.
