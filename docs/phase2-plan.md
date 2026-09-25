# Phase 2 Plan — Custom Modes, Rules and Skills in `.bob/`

## Overview

Phase 2 wires PinPilot's domain knowledge into Bob itself: four custom modes give the right
persona and tool permissions for each workflow step, four skills give each mode a precise
repeatable procedure, and project-level rules bake in the §14 conventions (firmware, LaTeX,
Windows, schema facts) so they apply automatically without restating them every session.

**Constraint: follow IBM Bob's documented format exactly.**
After all files are written the agent must confirm the modes appear in the mode selector and
the skills appear in the skills list (via Bob's hot-reload), and report the result.

**Key schema facts that must appear in rules (updated in Phase 1 corrections):**
- `pin_mapping` is keyed by **component pin name** (e.g. `"CS"`, `"DC"`, `"SDA"`), NOT by role.
- `libraries` is an **array** of `{platformio_id, version}` objects — not a single `library` object.
- Valid GPIOs on WROOM-32/DevKit: `0–19, 21–23, 25–27, 32–36, 39`. GPIO 37 and 38 are NOT broken out.
- GPIO25/26 are **ADC2** (not ADC1) and carry `adc2_wifi_conflict`.

---

## File Tree (13 new files)

```
.bob/
├── custom_modes.yaml
├── rules/
│   └── pinpilot-common.md
├── rules-esp32-architect/
│   └── 01-architect.md
├── rules-firmware-dev/
│   └── 01-firmware.md
├── rules-build-fixer/
│   └── 01-build-fixer.md
├── rules-tech-writer/
│   └── 01-tech-writer.md
└── skills/
    ├── generate-firmware/
    │   └── SKILL.md
    ├── lvgl-screen/
    │   └── SKILL.md
    ├── add-component/
    │   └── SKILL.md
    └── project-docs/
        └── SKILL.md
```

---

## Sub-Task 1 — `custom_modes.yaml`

**Status:** [ ] pending

### Intent
Define the four PinPilot modes in `.bob/custom_modes.yaml` using the exact IBM Bob schema
(`customModes` array, `slug`/`name`/`roleDefinition`/`groups`/`whenToUse`).

### Mode table

| Slug | Name | groups | Role summary |
|---|---|---|---|
| `esp32-architect` | ESP32 Architect | `read`, `skill`, `todo`, `mode` | Reads project.json + catalog, plans firmware structure. **No writes, no commands.** |
| `firmware-dev` | Firmware Dev | `read`, `edit`, `execute`, `skill`, `todo`, `subagent`, `mode` | Generates full PlatformIO project, runs first build, switches to build-fixer on failure. |
| `build-fixer` | Build Fixer | `read`, `edit`, `execute`, `skill`, `todo`, `mode` | Reads build errors, applies minimal fixes, max 2 additional attempts (3 total across firmware-dev + build-fixer). |
| `tech-writer` | Tech Writer | `read`, `edit`, `execute`, `skill`, `todo`, `mode` | Generates LaTeX docs and compiles the PDF. |

### Rules for slug naming
- Slugs: `esp32-architect`, `firmware-dev`, `build-fixer`, `tech-writer`  
  (all lowercase letters and hyphens only — matches `^[a-zA-Z0-9-]+$`)
- Each `roleDefinition` must be a focused persona (2–4 sentences), not a list of rules.
  Detailed rules go in the per-mode `rules-{slug}/` files, not inline.

### Expected Outcomes
- `.bob/custom_modes.yaml` exists and parses as valid YAML.
- All four modes appear in Bob's mode picker immediately (hot-reload, no restart).
- No slug collides with an existing global mode.

### Todo List
1. Confirm `.bob/custom_modes.yaml` does not already exist.
2. Write the file with the `customModes` array containing all four entries.
3. Verify Bob loads it (modes appear in mode selector); report result.

### Relevant Context
- Skill `create-mode` (already loaded this session) — covers schema, slug regex, group names.
- Valid group names: `read`, `edit`, `execute`, `mcp`, `skill`, `todo`, `subagent`, `mode`.
  **Do not use** `write`, `command`, `shell`, `run` — they are silently ignored.
- File must be at `.bob/custom_modes.yaml` (workspace scope, no `settings/` sub-directory).

---

## Sub-Task 2 — Common Rules (`rules/pinpilot-common.md`)

**Status:** [ ] pending

### Intent
One rules file that applies to **all four modes**. Encodes the schema facts updated in Phase 1
corrections, the Windows/PowerShell constraints, the working-agreement rules, and the
repository hygiene rules. Modes do not need to re-state these.

### Content areas
1. **Schema facts** — `pin_mapping` keyed by pin name; `libraries` array; valid GPIO set;
   ADC2 pins (include GPIO25/26/27); GPIO37/38 not broken out.
2. **Windows/PowerShell** — no bash scripts; `subprocess.run([...])` with arg lists;
   no `&&` command chaining; one command at a time.
3. **Working agreement** — plan first; max 3 fix attempts total (firmware-dev attempt 1,
   build-fixer attempts 2 and 3); never invent tool output or component data; append phase
   report to `docs/BOB_USAGE_LOG.md`.
4. **Repository hygiene** — no commit/push without user request; no secrets in repo;
   never modify `docs/PROJECT_PINPILOT.md` or `bob_sessions/`.

### Expected Outcomes
- `.bob/rules/pinpilot-common.md` exists.
- Bob loads it automatically for all four custom modes.

### Todo List
1. Create `.bob/rules/` directory.
2. Write `pinpilot-common.md` covering the four content areas above.

### Relevant Context
- Bob docs: `.bob/rules/` = general rules for all modes; `.bob/rules-{slug}/` = mode-specific.
- AGENTS.md §5, §11, §12, §13 — source of truth for the rules content.
- Phase 1 corrections — source of truth for the current schema facts.

---

## Sub-Task 3 — Mode-Specific Rules (4 files)

**Status:** [ ] pending

### Intent
One rules file per mode, in `.bob/rules-{slug}/01-<name>.md`. These extend the common rules
with the domain-specific constraints that only apply to that mode's workflow.

### `rules-esp32-architect/01-architect.md`
- **No file writes or shell commands.** Only read and plan.
- Must read `project.json` + every referenced catalog entry before proposing anything.
- Output format: structured plan listing every firmware file to create, the libraries to add
  to `lib_deps` (from each component's `libraries` array), and explicit open questions.
- Flag: any component whose `libraries` array is empty means no `lib_deps` entry needed
  (relay, soil sensor use `analogRead`/`digitalWrite` directly).

### `rules-firmware-dev/01-firmware.md`
Encodes §6 and §14.3/§14.4 verbatim:
- Non-blocking loop — no `delay()`, use `millis()`.
- One module per component: `src/components/<id>.h/.cpp` with `begin()` and `update()`.
- All pin numbers and I2C addresses in `include/pinmap.h` — no magic numbers.
- `Wire.begin(SDA, SCL)` called **once** before any I2C device `begin()`.
- Every `begin()` checks device presence; logs error to Serial if missing.
- Serial at 115200; startup summary (devices, bus config, pin map).
- Libraries pinned in `platformio.ini` from the catalog `libraries` array.
- Every generated file starts with the PinPilot header comment.
- **Two parallel subagents for generation:** subagent A = all sensor/actuator driver modules;
  subagent B = display/GUI code. `main.cpp`, `pinmap.h`, `platformio.ini` assembled by
  firmware-dev itself after both subagents complete.
- LVGL v9 API only (never v8 `lv_disp_drv_t` / `lv_disp_draw_buf_t`).
- No full-screen buffer — partial draw buffer (~1/10 screen).
- TFT_eSPI configured via `build_flags` only — never edit `.pio/libdeps/`.
- U8g2 for OLED (SSD1306/SH1106), not LVGL.
- After generation: run `python scripts/build.py examples/<demo>/firmware`.
- If build fails: switch to `build-fixer` mode (attempt 2 of 3).

### `rules-build-fixer/01-build-fixer.md`
- This is attempt 2 (or 3) of a maximum 3-attempt build loop started in firmware-dev.
- Read only the **first error block** from `build.py` output — do not open full `.pio` logs.
- Apply the **minimal fix** to the source file that caused the error.
- Never edit files inside `.pio/libdeps/` — fix the project source, not the library.
- After each fix: re-run `python scripts/build.py examples/<demo>/firmware`.
- After attempt 3 fails: stop, summarize (errors seen, files changed, hypotheses), ask user.

### `rules-tech-writer/01-tech-writer.md`
Encodes §14.6:
- Escape `_ & % # $ { }` in all generated LaTeX (use a Python escaping helper in the script).
- `pdflatex` only — no `fontspec`, `minted`, XeLaTeX, LuaLaTeX, `--shell-escape`.
- Allowed packages: `geometry`, `graphicx`, `booktabs`, `longtable`, `tikz`, `listings`,
  `xcolor`, `hyperref`, `caption`. Ask before adding others.
- Compile twice into `build/`; copy only the final PDF to `docs/`.
- `build/` is not committed (in `.gitignore`).

### Expected Outcomes
- Four files exist under their respective `rules-{slug}/` directories.
- Rules load automatically when the corresponding mode is active.

### Todo List
1. Create all four `rules-{slug}/` directories.
2. Write each `01-*.md` file as described above.

### Relevant Context
- Bob docs: files in `rules-{slug}/` are loaded alphabetically and combined with
  `customInstructions` in `custom_modes.yaml`. Prefix `01-` ensures correct order if more
  files are added later.

---

## Sub-Task 4 — Skills (4 SKILL.md files)

**Status:** [ ] pending

### Intent
One skill per major workflow step, placed under `.bob/skills/<skill-name>/SKILL.md`.
Each skill is a self-contained procedural guide that Bob follows when the skill activates.
Skills provide the **how** (step-by-step); the mode rules provide the **constraints**.

### Skill: `generate-firmware`

**Description:** Use when the user wants to generate firmware, generate a PlatformIO project,
or turn a project.json into Arduino code for the ESP32.

**Procedure:**
1. Read `project.json` and every catalog entry referenced by its components.
2. Build the file manifest: `platformio.ini`, `include/pinmap.h`, `src/main.cpp`,
   `src/components/<id>.h` and `src/components/<id>.cpp` for each component,
   display driver file if a `screen` block is present, `include/secrets.example.h`.
3. Assemble `lib_deps` from the `libraries` array of each catalog entry (skip empty arrays).
4. **Spawn two parallel subagents:**
   - Subagent A: generate all sensor/actuator driver modules
     (`src/components/<id>.h/.cpp` for every non-display component).
   - Subagent B: generate display/GUI code — invoke the `lvgl-screen` skill.
5. Wait for both subagents to complete; review their output.
6. Assemble `pinmap.h`, `main.cpp`, and `platformio.ini` (firmware-dev does this directly).
7. Run `python scripts/build.py examples/<demo>/firmware`.
8. If build passes: report RAM/flash usage and declare success.
9. If build fails: switch to `build-fixer` mode.

### Skill: `lvgl-screen`

**Description:** Use when generating display or screen code from a project.json screen block,
or when creating LVGL or U8g2 GUI code for an ESP32 display.

**Procedure:**
1. Read the `screen` block from `project.json`.
2. Look up the display's catalog entry (via `instance_id` → `catalog_id`).
3. Branch on driver:
   - `ssd1306` → U8g2 path: include `U8g2lib.h`; construct `U8G2_SSD1306_128X64_NONAME_F_HW_I2C`;
     render each widget in `update()` using `u8g2.clearBuffer()` / `u8g2.sendBuffer()`.
     Note: if the module is 1.3", try `U8G2_SH1106_128X64_NONAME_F_HW_I2C` if display is wrong.
   - `ili9341` / `st7789` → LVGL v9 path:
     - Use v9 API only (`lv_display_create`, `lv_display_set_flush_cb`, etc.).
     - Partial draw buffer (~1/10 screen = `LV_HOR_RES * 24 * 2` bytes).
     - `lv_tick_set_cb(millis)` for tick; call `lv_timer_handler()` every ~5 ms in `loop()`.
     - TFT_eSPI configured via `build_flags` in `platformio.ini`.
     - Generate one widget per `screen.widgets` entry using the correct LVGL v9 object.
4. Update widgets only when a new sensor value arrives (not every loop iteration).
5. Output the display driver `.h/.cpp` file pair.

### Skill: `add-component`

**Description:** Use when adding a new component to the catalog, importing a component from a
datasheet, or creating a catalog JSON entry from a PDF datasheet.

**Procedure:**
1. Ask the user for the datasheet file path (PDF) and the component's primary interface type.
2. Read the datasheet using the document-understanding tool.
3. Extract: component name, supply voltage, logic voltage, I2C addresses (default + how to
   change), pin list (name + role), min read interval if applicable.
4. Map each pin to a role from the catalog schema enum:
   `vcc`, `gnd`, `i2c_sda`, `i2c_scl`, `spi_mosi`, `spi_miso`, `spi_sck`, `spi_cs`,
   `gpio_in`, `gpio_out`, `adc`, `onewire`, `uart_tx`, `uart_rx`,
   `i2s_bck`, `i2s_ws`, `i2s_data`, `pwm`, `config`.
   Use `"config"` for pins tied to GND/VCC that are never wired to the ESP32.
5. Identify the PlatformIO library (search registry if not stated in datasheet).
   Mark version as `"TODO: verify"` if unconfirmed — **never invent a version number**.
   Set `libraries: []` if no library is needed.
6. Write the JSON entry to `catalog/components/<id>.json`.
7. Run `python -c "import json,sys; json.load(open(sys.argv[1]))" catalog/components/<id>.json`
   to confirm it parses.
8. Report any fields marked `"TODO: verify"` that need confirmation before Phase 4.

### Skill: `project-docs`

**Description:** Use when generating LaTeX documentation, a wiring table, or a pin map for
a PinPilot project.

**Procedure:**
1. Read `project.json`, all referenced catalog entries, and `catalog/esp32_devkit_pins.json`.
2. Generate a Python script `scripts/generate_docs.py` (if it does not exist) that:
   - Escapes all LaTeX special characters (`_ & % # $ { }`) via a helper function.
   - Produces a `.tex` file with: title page, architecture overview, wiring table
     (component → pin name → ESP32 GPIO), bus configuration table, per-component notes,
     and screen widget table (if `screen` block present).
3. Run `python scripts/generate_docs.py examples/<demo>/project.json docs/<demo>.tex`.
4. Run `pdflatex -output-directory build docs/<demo>.tex` twice.
5. Run `copy build\<demo>.pdf docs\` (Windows `copy` command).
6. Report page count and any LaTeX warnings.

### Expected Outcomes
- Four `SKILL.md` files exist under `.bob/skills/<name>/SKILL.md`.
- Skill names match `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, hyphens only).
- Skills appear in Bob's skills list in the next task (hot-reload applies to modes but skills
  require a new task/context window to activate for the first time).
- Agent must verify skill files are present and readable; report any that fail to load.

### Todo List
1. Create `.bob/skills/` directory.
2. Write `generate-firmware/SKILL.md`.
3. Write `lvgl-screen/SKILL.md`.
4. Write `add-component/SKILL.md`.
5. Write `project-docs/SKILL.md`.
6. Confirm skill name regex is valid for all four names.

### Relevant Context
- Skill format: frontmatter with `name` + `description`; body = procedural steps.
- Skill `create-skill` (loaded this session) — covers frontmatter schema, name regex, file location.
- Skill names used: `generate-firmware`, `lvgl-screen`, `add-component`, `project-docs`.
  All match `^[a-z0-9]+(-[a-z0-9]+)*$`. ✓

---

## Sub-Task 5 — Verification and Log

**Status:** [ ] pending

### Intent
Confirm Bob has loaded all four modes and four skills, report the result, and append the
Phase 2 report to `docs/BOB_USAGE_LOG.md`.

### Verification steps
1. **Modes** — Bob hot-reloads `custom_modes.yaml` immediately. The agent must state which
   modes appear in the mode selector. If any are missing, check: slug regex, duplicate slugs,
   group name spelling, YAML parse errors.
2. **Skills** — Skills become available in the **next task/context window**. The agent must
   state all four skill file paths exist and are readable (use `read_file` on each `SKILL.md`).
   The user will confirm they appear in the skills list when starting the next session.
3. **Rules** — Cannot be directly confirmed by the agent, but the agent must list all rule
   files created and verify they exist on disk.

### Phase 2 report to append to `docs/BOB_USAGE_LOG.md`
Must include:
- Bob features used (modes, skills, rules, document understanding).
- Files created (with paths).
- Verification results (modes confirmed / skills files present).
- Open issues for Phase 3.

### Todo List
1. Read back each created file to confirm it is valid YAML/Markdown.
2. Report mode selector status for the four modes.
3. Report skill file presence (4 files confirmed readable).
4. Append Phase 2 report to `docs/BOB_USAGE_LOG.md`.

---

## Execution Order

```
Sub-Task 1 (custom_modes.yaml)
    → Sub-Task 2 (common rules)
        → Sub-Task 3 (mode-specific rules, all 4 in one pass)
            → Sub-Task 4 (skills, all 4 in one pass)
                → Sub-Task 5 (verify + log)
```

Sub-tasks 3 and 4 can each be done in a single agent pass (multiple files written in parallel)
because the files are independent of each other.

---

## Constraints (enforced throughout)

- **IBM Bob documented format only.** Group names must be from the exact list: `read`, `edit`,
  `execute`, `mcp`, `skill`, `todo`, `subagent`, `mode`. `write`/`command`/`shell`/`run` are
  silently ignored by Bob.
- **Workspace scope.** All files go under `.bob/` (not `~/.bob/`). No `settings/` sub-directory
  for workspace files.
- **Slug regex.** `^[a-zA-Z0-9-]+$` — confirmed valid for all four slugs.
- **Skill name regex.** `^[a-z0-9]+(-[a-z0-9]+)*$` — confirmed valid for all four skill names.
- **No duplicate slugs** within `custom_modes.yaml`.
- **Minimal roleDefinitions** — 2–4 sentences of persona. Detailed rules go in `rules-{slug}/`.
- **generate-firmware uses exactly 2 parallel subagents** (not one per component): one for
  all sensor/actuator drivers, one for display/GUI. `main.cpp`, `pinmap.h`, and
  `platformio.ini` are assembled by firmware-dev itself.
