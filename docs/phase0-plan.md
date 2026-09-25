# Phase 0 Plan — PinPilot Foundations

## Top-Level Overview

**Goal:** Produce the two deliverables that every subsequent phase depends on:
1. `AGENTS.md` — the persistent project context that Bob reads at the start of every session.
2. Updates to `.gitignore` and `.bobignore` — append the PinPilot-specific entries listed in §14.7
   without touching the existing hackathon template entries.

No source code, schemas, or web app files are written in Phase 0. The output is purely
documentation and tooling-guard configuration that shapes all later work.

**Scope:** Two files modified, one file created.

**Non-goals:** Custom modes (Phase 2), JSON schemas (Phase 1), web app (Phase 3).

---

## Sub-Task A — Audit and append `.gitignore`

**Status:** `[x] done`

### Intent
The existing `.gitignore` already contains the IBM hackathon template entries (lines 1–120)
marked "DO NOT REMOVE". We must append PinPilot-specific entries *after* that block.

Required additions from §14.7:
- `web/dist/` (Vite production build output)
- `.pio/` (PlatformIO toolchain and compiled objects)
- `*.aux`, `*.log`, `*.out`, `*.toc`, `*.synctex.gz` (LaTeX build artefacts)
- `secrets.h` (generated firmware WiFi credentials — never committed)

Note: `node_modules/`, `build/`, `__pycache__/`, `.venv/` are **already present** in the
template's entries — do not duplicate them.

### Expected Outcomes
- Running `git status` on a Vite build, a PlatformIO build, or a LaTeX build shows none of those
  artefacts as untracked.
- `include/secrets.h` (if it ever exists) is silently ignored by git.
- The original template block is 100% intact.

### Todo List
1. Read `.gitignore` lines 117–120 to find the exact insertion point.
2. Append the PinPilot section after the last line of the file.

### Relevant Context
- File: `.gitignore` — the marker comment on line 120 says "Add project-specific patterns below".
- Section: §14.7 Repository hygiene.

---

## Sub-Task B — Audit and append `.bobignore`

**Status:** `[x] done`

### Intent
The existing `.bobignore` (lines 1–91) is the IBM hackathon template and must not be modified.
We append PinPilot entries so Bob does not index large binary or generated files.

Required additions from §14.7:
- `node_modules/`
- `.pio/`
- `web/dist/`
- `build/`
- Large datasheet PDFs: `docs/*.pdf` (exception: when `add-component` skill explicitly needs one,
  Bob reads it directly — the ignore entry is still correct because Bob reads it on demand).

### Expected Outcomes
- Bob does not attempt to index `node_modules/`, `.pio/`, or `build/` directories.
- Datasheet PDFs in `docs/` are not auto-indexed but can still be passed explicitly.
- The original template block (lines 1–91) is 100% intact.

### Todo List
1. Append the PinPilot section after the last line of `.bobignore`.

### Relevant Context
- File: `.bobignore` — the marker comment on line 90 says "DO NOT REMOVE ABOVE PATTERNS".
- Section: §14.7 Repository hygiene.

---

## Sub-Task C — Create `AGENTS.md`

**Status:** `[x] done`

### Intent
`AGENTS.md` is the single-file project context that Bob reads automatically at session start
(via `/init` or project open). It must encode the decisions, conventions and pitfalls from §14
so that every Bob mode starts informed without re-reading the full spec.

### Expected Outcomes
- A developer (or Bob, in a new context window) can read `AGENTS.md` alone and know:
  - What PinPilot is and what phase is in progress.
  - The full repository layout.
  - Every hard rule from §14 (Windows-only commands, no bash, LVGL v9 API only, etc.).
  - The build commands and where outputs go.
  - Working agreement and Bobcoin-saving rules.
  - A phase completion tracker they can update after each phase.
- The file is ≤ 300 lines (concise reference, not a narrative essay).

### Todo List
1. Draft `AGENTS.md` with the sections listed below.
2. Cross-check every §14 sub-section to confirm all pitfalls are captured.
3. Verify no spec text is duplicated verbatim in a way that would go stale.

### `AGENTS.md` sections (ordered)

| # | Section | Content |
|---|---------|---------|
| 1 | Project snapshot | One-paragraph summary of PinPilot, board target, hackathon deadline |
| 2 | Phase tracker | Table of phases 0–6 with status (✅ done / 🔄 in progress / ⬜ pending) — updated after each phase |
| 3 | Repository layout | Verbatim tree from §14.2 |
| 4 | Commands reference | `npm run dev`, `pio run`, `python scripts/validate_project.py`, `python scripts/build.py <dir>`, `pdflatex` compile sequence |
| 5 | Environment rules | Windows 11 / PowerShell. Python scripts only (pathlib + subprocess list). No `&&`. One command at a time. Check tools before Phase 1. |
| 6 | Firmware rules | All 9 rules from §6 (non-blocking loop, millis scheduling, one module per component, pinmap.h, begin() check, Serial 115200, shared Wire, pinned lib versions, file headers) |
| 7 | PlatformIO / Arduino pitfalls | §14.3 verbatim key points: `platformio.ini` fields, one library per device, `Wire.begin(SDA, SCL)` first, RAM budget |
| 8 | Display / LVGL pitfalls | §14.4: LVGL v9 API only, `lv_conf.h` location, partial draw buffer, `lv_timer_handler()` every 5 ms, TFT_eSPI via build_flags only, U8g2 for OLED |
| 9 | Web app pitfalls | §14.5: Vite + React + TypeScript, no extra packages without asking, catalog loaded from JSON not duplicated in TS, file download export |
| 10 | LaTeX pitfalls | §14.6: escape `_ & % # $ { }`, pdflatex only, allowed packages list, compile twice into `build/`, copy PDF to `docs/` |
| 11 | Security rules | No secrets in repo. `include/secrets.h` gitignored. No IBM Cloud credentials. |
| 12 | Repository hygiene | Small commits, one per phase, conventional commit messages. Do not commit unless asked. |
| 13 | Working agreement | Plan first. Max 3 fix attempts. Never invent tool output. Never invent component data. Mark unknowns as `"TODO: verify"`. Phase-end report → `docs/BOB_USAGE_LOG.md`. |
| 14 | Open issues / future work | Placeholder section for out-of-scope ideas |

### Relevant Context
- Source of truth: `docs/PROJECT_PINPILOT.md` sections 6, 8, 14.
- All rules in `AGENTS.md` must trace to the spec; nothing invented.

---

## Sub-Task D — Create `docs/BOB_USAGE_LOG.md`

**Status:** `[x] done`

### Intent
The hackathon submission requires an "IBM Bob Usage Statement" built from a usage log.
The log file must exist from Phase 0 so every phase can append to it. Creating an empty
shell now avoids forgetting it later.

### Expected Outcomes
- `docs/BOB_USAGE_LOG.md` exists with a header and a Phase 0 entry.
- Subsequent phases append entries without restructuring the file.

### Todo List
1. Create `docs/BOB_USAGE_LOG.md` with a table header and a Phase 0 row.

### Relevant Context
- Section §14.8: "Append that report to `docs/BOB_USAGE_LOG.md`."
- Section §15: IBM Bob Usage Statement ≤ 500 words, built from this log.

---

## Execution Order

```
A (append .gitignore)
B (append .bobignore)   } can be done in parallel — no dependencies
D (create BOB_USAGE_LOG.md)

C (create AGENTS.md)    — depends on nothing, but logically last because it
                          references the finalized layout established by A/B
```

---

## Open Questions and Decisions Needed

The following items need your confirmation before implementation begins.

### OQ-1 — `requirements.txt`
§14.2 lists `requirements.txt` at the root. Phase 1 will need it for the Python scripts
(`jsonschema`, potentially `click` for the CLI). Should it be created in Phase 0 as an empty
placeholder (or with only known deps), or left entirely to Phase 1?

**Proposed answer:** Create a minimal `requirements.txt` in Phase 0 with `jsonschema>=4.0`
(the only confirmed dep so far). Phase 1 appends to it.

---

### OQ-2 — Phase tracker format in `AGENTS.md`
Should the phase tracker in `AGENTS.md` use a simple Markdown table (easy to update by
text replacement) or a checklist (easier to scan at a glance)?

**Proposed answer:** Markdown table with a status emoji column — easier to update without
parsing lists.

---

### OQ-3 — `.gitignore` entry for `*.log`
The existing template already has `*.log` (line 108). The spec §14.7 does not re-list it.
However, LaTeX also generates `.log` files. Should we add a scoped `build/*.log` entry, or
rely on the existing `build/` ignore (already present on line 107 as `build/`) to handle it?

**Proposed answer:** The existing `build/` entry already ignores everything under `build/`,
and the global `*.log` covers stray LaTeX logs at root level. No new entry needed.

---

### OQ-4 — `bob_sessions/` `.gitkeep`
The directory already exists with only a `.gitkeep`. The spec says screenshots go there.
Should `AGENTS.md` include a note reminding the user (not Bob) to capture screenshots after
each phase and drop them here?

**Proposed answer:** Yes — a one-liner reminder in the Working Agreement section.

---

### OQ-5 — Scope of `AGENTS.md` vs `.bob/` rules
Phase 2 will create custom mode files in `.bob/`. Some rules (e.g. "LVGL v9 only") will
appear in both `AGENTS.md` and the mode instructions. Is that intentional duplication
acceptable, or should `AGENTS.md` be a summary with a pointer to the skill files?

**Proposed answer:** Duplication is acceptable for Phase 0 — `AGENTS.md` is the portable
reference readable without `.bob/`. Phase 2 can fine-tune the skill files to be more
specific while `AGENTS.md` stays as the always-available baseline.
