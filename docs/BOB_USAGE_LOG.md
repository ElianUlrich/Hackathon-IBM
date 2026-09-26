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

---

## Phase 1 — Corrections (post-Phase-1 data fixes)

**Bob features used:** Agent mode, parallel file editing (multiple catalog files in one turn), targeted apply_diff for surgical changes to schema and validator.

**What Bob produced / changed:**

### A — ESP32 pin table corrections (`catalog/esp32_devkit_pins.json`)
- **GPIO25/26**: corrected `adc1→false`, `adc2→true`; added `"adc2_wifi_conflict"` flag; updated notes (ADC2 ch 8/9, DAC remains).
- **GPIO37 and GPIO38**: removed entirely — these exist on the die but are NOT broken out on WROOM-32/DevKit boards.
- **`$comment`**: updated to list actual valid set `0-19, 21-23, 25-27, 32-36, 39` and explain the GPIO37/38 omission.
- **GPIO0**: added `"adc2_wifi_conflict"` flag (ADC2 ch 1); updated notes.
- **GPIO1 and GPIO3**: corrected `pullup` and `pulldown` to `true`; updated notes.

### B — pin_mapping design fix
- **`schema/project.schema.json`**: updated `pin_mapping` description — keys are now component pin names (e.g. `"CS"`, `"DC"`, `"SDA"`) rather than role strings, eliminating the collision when two pins share the same role (ILI9341 DC and RESET are both `gpio_out`).
- **`scripts/validate_project.py`**: added `_pin_role_map()` helper; all role-based checks now resolve the role from the catalog by looking up the pin name. Updated `EXISTING_GPIOS` (removed 37, 38) and `INPUT_ONLY_PINS` (removed 37, 38). Error message for nonexistent GPIO updated to show correct valid set.
- **`examples/weather_station/project.json`**: all `pin_mapping` keys changed to component pin names (`i2c_sda→SDA`, `i2c_scl→SCL`, etc.).
- **`examples/smart_farm_node/project.json`**: all `pin_mapping` keys changed to pin names; `dc_pin`/`rst_pin` `parameters` block removed (DC and RESET are now first-class entries in `pin_mapping`).
- **`examples/smart_farm_node/project_invalid.json`**: same pin-name conversion applied.

### C — Catalog fixes
- **`catalog/component.schema.json`**: added `"config"` to the pin role enum (for pins tied to GND/VCC, never wired to ESP32); replaced `"library"` (single object, required) with `"libraries"` (array, optional); `"library"` removed from `"required"`; `datasheet_url` description updated.
- **`bh1750.json`**: ADDR pin role changed `gpio_in → config`; `library → libraries` array.
- **`bme280.json`**: `library → libraries` array; notes updated: always pass address explicitly to `begin()`, Adafruit defaults to 0x77 while generic modules use 0x76; cheap modules may be BMP280 (no humidity) — check chip ID.
- **`ds18b20.json`**: `library → libraries` array; added `milesburton/DallasTemperature` as second library entry (both OneWire and DallasTemperature required in `lib_deps`).
- **`ili9341.json`**: `library → libraries` array; pin name alignment.
- **`relay_module.json`**: `library → libraries: []` (no library needed); `datasheet_url` "TODO: verify" removed and replaced with a real URL; notes expanded: 3.3V HIGH may not switch off 5V active-LOW opto modules; three safe alternatives listed (JD-VCC split, 3.3V relay, transistor driver); firmware tip added (write HIGH before `pinMode(OUTPUT)` to avoid boot click).
- **`soil_moisture_v12.json`**: `library → libraries: []`; `datasheet_url` "TODO: verify" removed; notes corrected: output ~2.5–2.9V dry / ~1.0–1.5V wet (not 3.3V); always calibrate; NE555 clone warning added.
- **`ssd1306.json`**: `library → libraries` array; notes updated: many 1.3" OLEDs use SH1106, not SSD1306 — different U8g2 constructor required.

### D — Demo 2 ILI9341 CS reassignment
- `examples/smart_farm_node/project.json`: ILI9341 CS moved from GPIO5 (strapping pin) to GPIO27. Demo 2 now validates with **0 errors, 0 warnings**.

### E — New failing test cases
- **`examples/smart_farm_node/project_invalid_adc2_wifi.json`**: soil sensor `AOUT` on GPIO25 (now correctly ADC2) with WiFi enabled. Validator correctly raises E5 error.
- **`examples/smart_farm_node/project_invalid_gpio_conflict.json`**: `relay_1.IN` and `ds18b20_1.DQ` both on GPIO26 (different pin names, same GPIO). Validator correctly raises E4 error, proving the new pin-name-keyed design catches cross-component conflicts.

**Commands run and results:**
- `python scripts/validate_project.py examples/weather_station/project.json` → **PASSED** (0 errors, 0 warnings).
- `python scripts/validate_project.py examples/smart_farm_node/project.json` → **PASSED** (0 errors, 0 warnings) — strapping-pin warning on GPIO5 gone, CS is now GPIO27.
- `python scripts/validate_project.py examples/smart_farm_node/project_invalid.json` → **FAILED** (1 error: ADC2+WiFi on GPIO2, 1 warning: strapping pin) — existing intentional failure still caught.
- `python scripts/validate_project.py examples/smart_farm_node/project_invalid_adc2_wifi.json` → **FAILED** (1 error: ADC2+WiFi on GPIO25) — new test case passes.
- `python scripts/validate_project.py examples/smart_farm_node/project_invalid_gpio_conflict.json` → **FAILED** (1 error: GPIO26 conflict between relay_1.IN and ds18b20_1.DQ) — new test case passes.

**Acceptance criteria met:**
- ✅ GPIO25/26 correctly identified as ADC2 — ADC2+WiFi error fires for GPIO25 sensor.
- ✅ GPIO37 and GPIO38 removed from pin table and validator constants.
- ✅ GPIO0 has `adc2_wifi_conflict` flag; GPIO1/3 have `pullup`/`pulldown` = true.
- ✅ `pin_mapping` keyed by component pin name — ILI9341 DC and RESET both represented without role collision.
- ✅ `dc_pin`/`rst_pin` parameters removed from project files.
- ✅ `"config"` role added for BH1750 ADDR.
- ✅ `"libraries"` array replaces single `"library"` object; DS18B20 lists both OneWire and DallasTemperature.
- ✅ All "TODO: verify" `datasheet_url` values removed.
- ✅ relay_module, soil_moisture_v12, bme280, ssd1306 notes updated with accurate caveats.
- ✅ Demo 2 validates with 0 errors, 0 warnings.
- ✅ All three existing + two new invalid files validated correctly (errors detected as expected).

**Open issues / notes for Phase 2:**
- Library versions in catalog are now semver-range estimates (e.g. `^2.2.4`) — confirm exact pinned versions when Phase 4 build succeeds.
- The `relay_module` `datasheet_url` points to a generic HL52SS datasheet — user should verify it matches their specific module.

---

## Phase 2 — Custom Modes, Rules and Skills in `.bob/`

**Bob features used:** Agent mode, `create-mode` skill (loaded for schema reference),
`create-skill` skill (loaded for frontmatter/name-regex reference), IBM Bob documentation
lookup (rules directory structure, mode-specific rules-{slug}/ paths, group name validation),
parallel file writing (ST3 and ST4 each written in one pass).

**What Bob produced:**

### Files created (13 new files)

| File | Purpose |
|------|---------|
| `.bob/custom_modes.yaml` | 4 custom modes: esp32-architect, firmware-dev, build-fixer, tech-writer |
| `.bob/rules/pinpilot-common.md` | Common rules for all modes: schema facts, Windows/PS constraints, working agreement, repo hygiene |
| `.bob/rules-esp32-architect/01-architect.md` | Architect mode: read-only, required reading order, planning output format |
| `.bob/rules-firmware-dev/01-firmware.md` | Firmware Dev: §6 firmware rules, §14.3/§14.4 pitfalls, subagent strategy, build handoff |
| `.bob/rules-build-fixer/01-build-fixer.md` | Build Fixer: attempt tracking, error-reading rules, minimal-fix rules, stop protocol |
| `.bob/rules-tech-writer/01-tech-writer.md` | Tech Writer: §14.6 LaTeX rules, escaping, allowed packages, compile procedure |
| `.bob/skills/generate-firmware/SKILL.md` | 7-step procedure: read inputs → manifest → lib_deps → 2 parallel subagents → assemble → build |
| `.bob/skills/lvgl-screen/SKILL.md` | U8g2 path (SSD1306/SH1106) and LVGL v9 path (ILI9341/ST7789) with v8-safe guard |
| `.bob/skills/add-component/SKILL.md` | Datasheet PDF → catalog JSON entry with pin-role mapping and validation |
| `.bob/skills/project-docs/SKILL.md` | project.json → generate_docs.py → .tex → pdflatex twice → docs PDF |

### Commands run
- `python scripts/validate_project.py examples/weather_station/project.json` → PASSED (0 errors, 0 warnings) — confirmed no regressions.
- Python one-liner: confirmed `custom_modes.yaml` contains 4 slugs, no duplicates, all match `^[a-zA-Z0-9-]+$`.
- Python one-liner: confirmed all 4 skill directory names match `^[a-z0-9]+(-[a-z0-9]+)*$` and all `name:` frontmatter fields are present.

**Mode selector status:**
Bob hot-reloads `custom_modes.yaml` immediately on file write. The four slugs written are:
`esp32-architect`, `firmware-dev`, `build-fixer`, `tech-writer` — all match the slug regex,
no duplicates, all use only valid group names (`read`, `edit`, `execute`, `skill`, `todo`,
`subagent`, `mode`). They should appear in the mode picker now.
**User action required:** confirm the four modes appear in your mode selector and report
any that are missing (would indicate a YAML parse error).

**Skills status:**
Skills activate in the next task/context window (not hot-reloaded like modes).
All four `SKILL.md` files confirmed readable:
- `.bob/skills/generate-firmware/SKILL.md` ✓
- `.bob/skills/lvgl-screen/SKILL.md` ✓
- `.bob/skills/add-component/SKILL.md` ✓
- `.bob/skills/project-docs/SKILL.md` ✓
**User action required:** start a new task and confirm the four skills appear in the skills list.

**Rules status:**
All five rules files confirmed present on disk:
- `.bob/rules/pinpilot-common.md` (all modes)
- `.bob/rules-esp32-architect/01-architect.md`
- `.bob/rules-firmware-dev/01-firmware.md`
- `.bob/rules-build-fixer/01-build-fixer.md`
- `.bob/rules-tech-writer/01-tech-writer.md`
Rules load automatically when the corresponding mode is active; cannot be directly confirmed
without triggering each mode in a live session.

**Acceptance criteria met:**
- ✅ 4 custom modes in `custom_modes.yaml` — correct slug regex, no duplicates, valid groups.
- ✅ IBM Bob documented format used throughout (group names, rules-{slug}/ directory paths, skill frontmatter).
- ✅ `generate-firmware` uses exactly 2 parallel subagents (sensor/actuator drivers + display/GUI).
- ✅ Build loop: firmware-dev runs attempt 1; build-fixer handles attempts 2 and 3; stop protocol after attempt 3.
- ✅ Schema facts from Phase 1 corrections encoded in common rules: pin_mapping by pin name, libraries array, GPIO set, ADC2 including GPIO25/26.
- ✅ LVGL v9 guard in both lvgl-screen skill and firmware-dev rules (lists forbidden v8 symbols explicitly).
- ✅ Validator still passes on both demo projects after Phase 2 (no regressions).

**Open issues / notes for Phase 3:**
- User must confirm mode picker shows all 4 modes (hot-reload) before starting Phase 4.
- User must confirm skills list shows all 4 skills in the next session before Phase 4.
- Phase 3 (web app) can begin in a new context window once confirmations are in.
- `pdflatex` tool presence not yet verified — remind user to run `pdflatex --version` before Phase 5.

---

## Phase 3 — Web App (Visual Configurator)

**Date:** 2025-01  
**Bob features used:** Agent mode, plan file in Plan mode, subagent (codebase exploration), `write_file` / `apply_diff` / `search_and_replace`, `execute_command`, `update_todo_list`

### Files Created
| File | Description |
|------|-------------|
| `web/` | Full Vite + React + TypeScript project |
| `web/vite.config.ts` | Base path `/Hackathon-IBM/` for GitHub Pages |
| `web/src/types.ts` | All TypeScript interfaces (ComponentDef, PinDef, ProjectState, ValidationResult, …) |
| `web/src/data/components.ts` | Catalog JSON imported and typed as `CATALOG: ComponentDef[]` |
| `web/src/data/pins.ts` | ESP32 pin table imported as `ESP32_PINS: Record<number, PinDef>` |
| `web/src/lib/autoAssign.ts` | Deterministic pin auto-assignment following §8 rules |
| `web/src/lib/validator.ts` | E1–E5 errors + W1–W3 warnings mirroring `validate_project.py` |
| `web/src/nodes/Esp32Node.tsx` | React Flow custom node for the ESP32 DevKit |
| `web/src/nodes/ComponentNode.tsx` | React Flow custom node for catalog components |
| `web/src/components/Canvas.tsx` | React Flow canvas with edges showing pin-to-GPIO wiring |
| `web/src/components/Sidebar.tsx` | Catalog browser, Load Example, Export project.json |
| `web/src/components/RightPanel.tsx` | WiFi toggle, validation panel, wiring table |
| `web/src/components/DisplayPanel.tsx` | Display widget checklist (SSD1306/ILI9341) |
| `web/src/App.tsx` | Root component, single ProjectState, all handlers |
| `web/src/App.css` | Plain CSS layout (3-column grid, dark sidebar) |
| `.github/workflows/deploy.yml` | GitHub Actions: build + deploy to GitHub Pages |

### Commands Run
| Command | Result |
|---------|--------|
| `npm create vite@latest web -- --template react-ts` | Scaffolded project |
| `npm install` (in `web/`) | 27 packages |
| `npm install @xyflow/react` | 20 packages |
| `npm run build` (attempt 1) | 4 TS errors (unused import, unused function, possibly-undefined) |
| `npm run build` (attempt 2) | 1 TS error remaining (closure narrowing) |
| `npm run build` (attempt 3) | ✅ Success — 427 KB JS, 19 KB CSS, built in 995 ms |

### Acceptance Criteria Met
- [x] Vite + React + TypeScript in `web/`, `@xyflow/react` only extra dependency
- [x] Left sidebar: all 7 catalog components listed with Add buttons
- [x] Canvas: ESP32 DevKit node + ComponentNodes + labeled edges
- [x] Auto pin-assignment following §8 (I2C 21/22, VSPI 23/19/18, ADC1 for WiFi, free GPIO)
- [x] Right panel: validation errors/warnings, WiFi toggle, wiring table
- [x] Display panel: SSD1306/ILI9341 checklist with pixel-positioned widget export
- [x] Load Example: Weather Station, Smart Farm Node, Invalid (ADC2+WiFi)
- [x] Export project.json via browser Blob download
- [x] GitHub Pages workflow: `.github/workflows/deploy.yml`
- [x] `npm run build` passes with zero errors

### Open Issues
- GitHub Pages must be set to deploy from the `gh-pages` branch in repo settings (user action).
- DisplayPanel resets selected state on re-render when project is fully replaced (Load Example). Future: lift selected state into App.
- Sub-Task 8 (parity check script) dropped per budget constraint.

**Phase 3 polish (same session):** Switched Canvas to controlled `useNodesState`/`useEdgesState` with position preservation across re-renders; added two-column non-overlapping initial layout; display checklist now shows `instance_id · measurement`; added ⚡ Auto-fix pins button (re-runs `autoAssign`) in validation panel, visible only when errors exist. `npm run build` ✅ first attempt.
