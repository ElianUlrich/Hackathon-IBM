# Notes on the Bob task session screenshots

| File | Task | What it covers |
|---|---|---|
| `pinpilot_task01_phase0-1_summary.png` | Task 1 | Phase 0 (plan, AGENTS.md) and Phase 1 (catalog, schemas, pin table, validator) |
| `pinpilot_task02_phase1-fixes_phase2_summary.png` | Task 2 | Phase 1 data corrections **and** Phase 2 (custom modes, rules and skills) |
| `pinpilot_task03_phase2_summary.png` | Task 2 (same task) | Same task as above — see note below |
| `pinpilot_task04_phase3_webapp_summary.png` | Task 3 | Phase 3: web app and GitHub Pages deployment |
| `pinpilot_task05_demo1_firmware_summary.png` | Task 4 | Phase 4a: weather station firmware (build passed on attempt 1) |
| `pinpilot_task06_demo2_firmware_summary.png` | Task 5 | Phase 4b: smart farm node firmware with LVGL (build passed on attempt 2) |
| `pinpilot_task07_latex_docs_summary.png` | Task 6 | Phase 5: LaTeX documentation generator and PDF |

**Why the task02 and task03 screenshots look the same:** the Phase 1 corrections and
Phase 2 were done in the same Bob task, and the original screenshot taken right after
Phase 2 was lost. Both files therefore show the summary of that single task
(145k context tokens, 15.45 Bobcoins — the most expensive task of the project).
After this, every phase was run in a fresh task to keep the context and cost low.

The `chat_screenshots/` folder contains additional screenshots of the Bob chat taken
during development. The full phase-by-phase record is in
[`docs/BOB_USAGE_LOG.md`](../docs/BOB_USAGE_LOG.md).
