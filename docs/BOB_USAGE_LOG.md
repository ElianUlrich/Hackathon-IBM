# PinPilot — IBM Bob Usage Log

> This log tracks how IBM Bob was used in each phase of the PinPilot project.
> It is the source for the hackathon's **IBM Bob Usage Statement** (≤ 500 words).
> Append one entry per phase immediately after finishing that phase.

---

## Phase 0 — Foundations

**Bob features used:** Plan mode, document understanding (read full project spec), `spawn_subagent` for codebase inventory.

**What Bob produced:**
- Read and analyzed `docs/PROJECT_PINPILOT.md` (388 lines) in full, with special attention to sections 14 and 15.
- Proposed a detailed Phase 0 architecture plan (`docs/phase0-plan.md`) with sub-tasks, open questions, and execution order.
- After approval: appended PinPilot-specific entries to `.gitignore` and `.bobignore` without touching the IBM hackathon template sections.
- Created `AGENTS.md` (148 lines) as the persistent project context for all future Bob sessions.
- Created `docs/BOB_USAGE_LOG.md` (this file).
- Created `requirements.txt`.

**Commands run:** None (Phase 0 is documentation only).

**Acceptance criteria met:**
- ✅ Plan proposed and approved before any file was written.
- ✅ `AGENTS.md` covers all §14 rules and fits within the 150-line limit.
- ✅ `.gitignore` and `.bobignore` extended without modifying template sections.

**Open issues / next phase notes:**
- Before starting Phase 1, verify required tools: `node --version`, `npm --version`, `python --version`, `pio --version`, `pdflatex --version`.
- Phase 1 will add more dependencies to `requirements.txt` as they are confirmed.

---

## Phase 1 — Data layer (schemas, pin table, catalog, scripts)

**Bob features used:** Agent mode, parallel file generation (7 catalog entries written in one turn), document understanding (spec §7, §8, §9 cross-referenced throughout).

**What Bob produced:**
- `catalog/component.schema.json` — JSON Schema draft-07 for catalog entries.
- `catalog/esp32_devkit_pins.json` — ESP32-WROOM-32 GPIO capability table, 37 GPIOs (non-existent GPIOs 20, 24, 28–31 intentionally omitted).
- `catalog/components/` — 7 component entries: `bme280`, `bh1750`, `ssd1306`, `soil_moisture_v12`, `ds18b20`, `relay_module`, `ili9341`. All library versions marked `"TODO: verify"` pending real Phase 4 builds.
- `schema/project.schema.json` — JSON Schema for `project.json` export (board, components, buses, screen, app).
- `examples/weather_station/project.json` — Demo 1 project (BME280 + BH1750 + SSD1306).
- `examples/smart_farm_node/project.json` — Demo 2 project (soil moisture + DS18B20 + BME280 + relay + ILI9341).
- `examples/smart_farm_node/project_invalid.json` — Intentionally invalid Demo 2 (soil sensor on ADC2 GPIO2 with WiFi on).
- `scripts/validate_project.py` — Two-stage validator (JSON Schema + all §8 semantic rules). Uses `argparse` + `jsonschema` (stdlib + single dep).
- `scripts/build.py` — PlatformIO build wrapper using `subprocess.run([...])`. Prints BUILD PASSED/FAILED + first error lines.

**Commands run and results:**
- `pip install jsonschema>=4.0` — installed successfully.
- `python scripts/validate_project.py examples/weather_station/project.json` → **PASSED** (0 errors, 0 warnings).
- `python scripts/validate_project.py examples/smart_farm_node/project.json` → **PASSED** (0 errors, 1 warning: GPIO5 is a strapping pin — expected, used for ILI9341 CS).
- `python scripts/validate_project.py examples/smart_farm_node/project_invalid.json` → **FAILED** (1 error: ADC2+WiFi on GPIO2, 2 warnings) — validation correctly catches the intentional mistake.

**Acceptance criteria met:**
- ✅ Auto-assignment defaults from §8 used in all example project files.
- ✅ All §8 validation rules implemented and covered by the three example files.
- ✅ `validate_project.py` exits 0 on clean projects, 1 on errors.
- ✅ Python scripts use `argparse`, `pathlib`, and `subprocess.run([...])` — no bash, no shell strings.

**Open issues / notes for Phase 2:**
- Library versions in catalog are `"TODO: verify"` — will be confirmed in Phase 4 when a real build succeeds.
- Demo 2 has a GPIO5 strapping-pin warning for the ILI9341 CS. Consider reassigning CS to GPIO27 in Phase 4 (fewer constraints). Kept as-is for now to demonstrate the warning system.
- `pdflatex` was not checked — needed only in Phase 5. Remind user to verify before Phase 5.
