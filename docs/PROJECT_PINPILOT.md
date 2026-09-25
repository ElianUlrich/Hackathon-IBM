# PinPilot — Project Specification

> Document for IBM Bob 2.0. Read it in full before proposing any change, paying special
> attention to section 14. Work in **Plan mode** first and do not write code until the plan is approved.

---

## 1. Context

Project for the **IBM Bob 2.0 hackathon — "Build with purpose"**.
Brief: build a working prototype that improves a developer workflow
(onboarding, debugging, code review, testing, maintenance or release), using Bob's features
(Agent mode, subagents, parallel tasks, document understanding) and **demonstrating measurable impact**.

## 2. Problem

Starting an ESP32 project with several sensors and a display is slow and error-prone,
even for experienced embedded developers:

1. **Wiring and pin errors.** The classic ESP32 has many traps: input-only pins, strapping pins
   that break boot, flash pins, ADC2 not usable with WiFi, 5 V sensors on 3.3 V logic.
   These errors only show up on the bench, after hours of debugging.
2. **Protocol configuration.** Shared I2C buses, address conflicts, SPI chip selects,
   UART assignments and library setup must be worked out by hand from several datasheets.
3. **Display and GUI setup.** Getting an OLED or an LVGL touchscreen running (drivers,
   buffers, `lv_conf.h`, tick handling) takes a day on its own.
4. **Documentation.** Wiring diagrams and pin tables are rarely written, so projects are hard
   to hand over or reproduce.

Debugging takes 20–40% of an embedded developer's time, and a large part of it is caused by
configuration and wiring mistakes that could be caught before writing any code.

## 3. Solution

**PinPilot** turns a visual description of the hardware into a verified, documented firmware
project. It has two parts:

### Part 1 — Web app (visual configurator)
A browser app where the developer:
1. Picks components from a **catalog of typical market sensors, actuators and displays**.
2. Drops them on a canvas next to an **ESP32 DevKit (classic ESP32-WROOM-32)**.
3. Gets **automatic pin and bus assignment** following ESP32 best practices.
4. Sees the **wiring diagram** (which ESP32 pin goes to which component pin) and a wiring table.
5. Gets **real-time validation warnings** (pin conflicts, address conflicts, voltage issues).
6. Optionally adds a **display** (OLED or LVGL TFT) and picks which sensor values it shows.
   PinPilot uses a **predefined dashboard layout** (no free-form screen designer in this version).
7. Exports a single `project.json` file.

All validation in the web app is **deterministic** (rules + data tables). No AI runs in the browser.

### Part 2 — Bob as the firmware engineer
The developer opens `project.json` in Bob IDE. Using the PinPilot custom modes and skills, Bob:
1. Reads `project.json` and the catalog entries of the components used.
2. Generates a complete **PlatformIO project** (Arduino framework): `platformio.ini`, `main.cpp`,
   one driver module per component, the display/GUI code, and a non-blocking main loop.
3. **Compiles it** with PlatformIO. If the build fails, analyzes the errors, fixes them and
   rebuilds until it compiles (max 3 attempts, see 14.7).
4. Generates the **documentation in LaTeX**: architecture, wiring table, pin map, protocol
   configuration of every bus, and a description of each component and the screen layout.
5. (Document understanding) With the `add-component` skill, Bob reads a sensor **datasheet PDF**
   and produces a new catalog entry, so the catalog can grow without hand-writing JSON.

**Key principle:** no firmware is presented as "working" unless it compiled successfully.

## 4. Tech stack

| Item | Choice |
|---|---|
| Target board | **ESP32 DevKit (classic ESP32-WROOM-32)**, PlatformIO board `esp32dev` |
| Firmware framework | Arduino framework on PlatformIO (`platform = espressif32`) |
| Build tool | PlatformIO Core CLI (`pio run`) |
| Web app | React + TypeScript + Vite, **React Flow** for the canvas. Plain CSS, no other UI library. |
| Web app backend | **None.** Static app, runs locally with `npm run dev`. |
| Monochrome display | SSD1306 OLED 128x64 (I2C) with the **U8g2** library |
| Color display + GUI | ILI9341 or ST7789 TFT (SPI) with **LVGL v9** + **TFT_eSPI** |
| Helper scripts | Python 3 |
| Documentation | LaTeX (`article`, compiles with `pdflatex`) |

Everything must be free/open-source software and run on Windows.
Real hardware is **optional**: the main proof is a successful build.

## 5. Bob configuration to create

### Custom modes (in `.bob/`, project-level)
- **esp32-architect**: reads `project.json`, checks it against the catalog, plans the firmware
  structure. Does not write code.
- **firmware-dev**: generates the PlatformIO project following sections 6 and 14.
- **build-fixer**: runs the build, reads the errors and applies minimal fixes.
- **tech-writer**: generates the LaTeX documentation.

### Skills
- `generate-firmware`: from `project.json` to a PlatformIO project (structure, templates, rules).
- `lvgl-screen`: from the screen description in `project.json` to LVGL (TFT) or U8g2 (OLED) code.
- `add-component`: from a datasheet PDF to a catalog JSON entry that validates against the schema.
- `project-docs`: LaTeX document structure, wiring table and pin map.

### Subagents
When generating firmware, work in parallel: one subagent per component driver module,
one for the display/GUI code, one for the documentation.

### AGENTS.md
Generate the persistent project context with `/init` (structure, commands, rules, section 14).

## 6. Firmware rules (for `firmware-dev` and `build-fixer`)

1. **Non-blocking main loop.** No `delay()` in `loop()`. Each component has its own read period,
   scheduled with `millis()`.
2. Respect each sensor's minimum read interval from the catalog (e.g. DHT22: 2 s;
   DS18B20: ~750 ms conversion at 12-bit).
3. One module per component: `src/components/<id>.h/.cpp` with `begin()` and `update()` functions.
   `main.cpp` only wires modules together.
4. All pin numbers and I2C addresses come from a generated `include/pinmap.h`. No magic numbers
   in the code.
5. Every `begin()` checks for the device (e.g. I2C address ACK) and logs a clear error on
   `Serial` if it is missing, instead of hanging.
6. `Serial` at 115200 baud, with a startup summary: detected devices, bus configuration, pin map.
7. One shared `Wire` instance for the I2C bus and one SPI bus with a unique CS per device.
8. Library versions are pinned in `platformio.ini` (`lib_deps` with explicit versions).
9. Every generated file starts with a header comment: generated by PinPilot, source `project.json`,
   purpose of the file.

## 7. Data formats

### 7.1 Catalog entry — `catalog/components/<id>.json`
Each component is described by data, never hard-coded in the UI. Fields (to be finalized in a
JSON Schema, `catalog/component.schema.json`):
- `id`, `name`, `category` (sensor / actuator / display / audio), `description`
- `interface`: `i2c` | `spi` | `uart` | `i2s` | `gpio` | `adc` | `onewire` | `pwm`
- `supply_voltage`, `logic_voltage` (to detect 5 V parts needing level shifting)
- `i2c_addresses` (default and alternatives, with how to select them, e.g. "SDO to GND = 0x76")
- `pins`: list of component pins with their role (`vcc`, `gnd`, `i2c_sda`, `i2c_scl`,
  `spi_mosi`, `spi_miso`, `spi_sck`, `spi_cs`, `gpio_in`, `gpio_out`, `adc`, ...)
- `measurements`: values it provides (name, unit, range), used for screen bindings
- `min_read_interval_ms`
- `library`: PlatformIO library identifier and the version to pin
- `notes`: wiring tips (pull-ups, level shifting, power)
- `datasheet_url`

### 7.2 ESP32 pin table — `catalog/esp32_devkit_pins.json`
Single source of truth for pin capabilities, used by **both** the web app and the Python
validator. For each GPIO: capabilities (input, output, ADC1/ADC2, DAC, touch, pull-up support)
and flags (`input_only`, `strapping`, `flash`, `adc2_wifi_conflict`, `uart0_usb`).

### 7.3 Project file — `project.json`
Exported by the web app, validated against `schema/project.schema.json`:
- `board`: `esp32dev`
- `components`: instances, each with `instance_id`, catalog `id`, assigned bus, pin mapping,
  I2C address, and parameters
- `buses`: I2C / SPI / UART configuration (pins, speed)
- `screen` (optional): display instance, widgets (`label`, `value`, `bar`, `arc`, `chart`),
  position, size and binding (e.g. `bme280_1.temperature`)
- `app`: WiFi on/off (affects ADC2 rules), serial logging, global options

## 8. Validation and auto-assignment rules (web app + `validate_project.py`)

Auto-assignment defaults for the classic ESP32:
- I2C: SDA = GPIO21, SCL = GPIO22, shared by all I2C devices.
- SPI (VSPI): MOSI = GPIO23, MISO = GPIO19, SCK = GPIO18; CS assigned from free output pins.
- UART2: RX = GPIO16, TX = GPIO17.
- Analog sensors: **ADC1 pins only** (GPIO32–39) so they keep working with WiFi.
- Digital inputs: prefer pins with internal pull-ups when the component needs one.

Validation (errors block export, warnings do not):
- **Error:** using GPIO6–11 (connected to the flash).
- **Error:** output function on GPIO34–39 (input-only, no internal pull-ups).
- **Error:** two devices with the same I2C address on the same bus (suggest the alternative address).
- **Error:** the same pin assigned to two functions.
- **Error:** ADC2 pin used for an analog sensor while WiFi is enabled.
- **Warning:** strapping pins (GPIO0, 2, 5, 12, 15) used — may affect boot. GPIO12 pulled high at boot
  breaks flash voltage selection.
- **Warning:** GPIO1/GPIO3 (UART0) used — conflicts with USB serial logging.
- **Warning:** 5 V logic component connected directly (e.g. HC-SR04 ECHO) — needs a level shifter
  or voltage divider.

## 9. Demo projects and initial catalog

### Initial catalog (10–12 components)
BME280 (I2C, temperature/humidity/pressure), MPU6050 (I2C, IMU), BH1750 (I2C, light),
DHT22 (single GPIO), DS18B20 (OneWire), HC-SR04 (GPIO, 5 V), capacitive soil moisture sensor v1.2 (ADC),
NEO-6M GPS (UART), SSD1306 OLED 128x64 (I2C), ILI9341 2.8" TFT (SPI), relay module (GPIO),
and optionally INMP441 I2S microphone.

### Demo 1 — Weather station (Workflow: simple)
BME280 + BH1750 + SSD1306 OLED showing temperature, humidity and light.

### Demo 2 — Smart farm node (Workflow: full)
Soil moisture (ADC) + DS18B20 + BME280 + relay (irrigation pump) + ILI9341 with an **LVGL dashboard**
(arcs for moisture, labels for temperature, a chart of the last readings).
The demo also shows validation catching an intentional mistake (e.g. soil sensor on an ADC2 pin with
WiFi on, or two BME280 at the same address) before any code is generated.

### Demo 3 — Datasheet import
Bob reads the datasheet of a component not in the catalog and creates its entry with `add-component`.

## 10. Phased plan (save Bobcoins: 40 in total)

**Hard time limit: the hackathon lasts 48 hours. Submission deadline: Sunday Sep 27, 2026,
15:00 UTC.** Prefer a smaller working result over a bigger unfinished one. The last ~6 hours are
reserved for README, video and submission — no new features then.

| Phase | Deliverable | Mode | Priority |
|---|---|---|---|
| 0 | Approved plan + `AGENTS.md` | Plan / esp32-architect | Must |
| 1 | JSON schemas, ESP32 pin table, initial catalog (start with the Demo 1 and Demo 2 components), `validate_project.py`, `build.py` | Code | Must |
| 2 | Custom modes, rules and skills in `.bob/` | Code | Must |
| 3 | Web app v1: catalog, canvas, auto-assignment, validation panel, wiring view, export — **deployed to GitHub Pages** (public Application URL) | Code | Must |
| 4 | Firmware generation for Demo 1 (OLED) and Demo 2 (LVGL predefined dashboard) — both must compile | firmware-dev → build-fixer | Must |
| 5 | LaTeX docs for both demos + README with impact metrics + screenshots in `bob_sessions/` | tech-writer / Code | Must |
| 6 | Datasheet import demo with `add-component` | Code | Should |

**Stretch goals (only if everything above is done):** free-form screen designer in the web app;
export a Wokwi `diagram.json` to simulate the project in the browser; I2S microphone + digital
low-pass filter block.

Work on one phase per Bob task. Start a new context window between phases to avoid wasting tokens.

## 11. Acceptance criteria

- [ ] The web app runs with `npm run dev` and lets the user build Demo 1 and Demo 2 from the catalog.
- [ ] Auto-assignment follows section 8, and all validation rules are covered by tests
      (`validate_project.py` with example valid and invalid projects).
- [ ] The web app and the Python validator give the same result for the same `project.json`.
- [ ] The firmware generated for Demo 1 and Demo 2 compiles with `pio run` without errors.
- [ ] Demo 2 includes a working LVGL dashboard in the generated code.
- [ ] The LaTeX document of each demo compiles and includes the wiring table and the pin map.
- [ ] `add-component` produces a catalog entry that validates against the schema.
- [ ] The README explains installation and usage in fewer than 5 steps and includes impact metrics:
      estimated manual time vs. time with PinPilot.

## 12. Out of scope

- Other ESP32 variants (S2, S3, C3, C6) — the pin table is designed so they can be added later.
- ESP-IDF framework, OTA, cloud connectivity, battery/power budgeting.
- A backend server or user accounts in the web app.
- A screen designer or LVGL editor. Only one predefined dashboard layout per display type.

## 13. Language

- Code, comments, README, UI text and LaTeX documentation: **English** (international judges).
- Conversation with the user: English or Spanish, matching the language the user writes in.

---

## 14. Environment, conventions and known pitfalls

Read this section carefully: it exists to prevent the most common mistakes. Include its key
points in `AGENTS.md` (Phase 0) and turn them into project rules in `.bob/` (Phase 2).

### 14.1 Environment

- The user works on **Windows 11**. The default terminal may be PowerShell or cmd.
  - Do not write Bash scripts. Automation goes in **Python scripts** (`scripts/`) or npm scripts.
    In Python, use `pathlib` and `subprocess.run([...])` with argument lists, never shell strings.
  - Do not chain commands with `&&` (not supported in Windows PowerShell 5). One command at a time.
  - Run commands from the repository root unless a step says otherwise.
- Tools are installed by the user beforehand. **Before Phase 1**, check them with:
  `node --version`, `npm --version`, `python --version`, `pio --version`, `pdflatex --version`.
  If any is missing, **stop and tell the user**. Do not install software or edit the PATH.
- The **first PlatformIO build downloads the ESP32 toolchain** (several hundred MB, several minutes).
  The user runs one test build before starting. If a build is slow, wait; do not assume it failed.

### 14.2 Conventions (decided — do not ask again)

- Repository layout:
  ```
  Hackathon-IBM/
  ├── README.md, AGENTS.md, .gitignore, .bobignore, requirements.txt
  ├── .bob/                 # modes, rules, skills
  ├── web/                  # React + Vite app
  ├── catalog/              # component JSON files, schema, ESP32 pin table
  ├── schema/               # project.schema.json
  ├── scripts/              # validate_project.py, build.py
  ├── examples/             # demo project.json files and their generated firmware
  │   ├── weather_station/
  │   └── smart_farm_node/
  ├── docs/                 # this specification, BOB_USAGE_LOG.md, generated .tex/.pdf
  ├── .github/workflows/    # GitHub Pages deployment of the web app
  ├── build/                # LaTeX and other build outputs (not committed)
  └── bob_sessions/         # PNG screenshots of Bob tasks (required)
  ```
- Generated firmware lives in `examples/<demo>/firmware/` as a standalone PlatformIO project.
- `scripts/build.py <firmware dir>` runs `pio run -d <dir>`, prints `BUILD PASSED` or
  `BUILD FAILED`, and only the **first errors** of the output (not the full log).
- IDs: `snake_case` for catalog ids and instance ids (`bme280`, `bme280_1`).

### 14.3 PlatformIO / Arduino pitfalls

- `platformio.ini`: `platform = espressif32`, `board = esp32dev`, `framework = arduino`,
  `monitor_speed = 115200`, and **every library in `lib_deps` with a pinned version**.
  Only use library versions that were verified by an actual successful build.
- Use one library per component, the one declared in its catalog entry. Do not mix two libraries for
  the same device.
- I2C: call `Wire.begin(SDA, SCL)` once, before any I2C device `begin()`.
- Classic ESP32 has ~320 KB of RAM. Watch memory use; the build output shows RAM/flash usage —
  report it.

### 14.4 Display and LVGL pitfalls

- **Pin one LVGL major version (v9)** and only use the v9 API. Do not copy v8 examples
  (`lv_disp_drv_t`, `lv_disp_draw_buf_t` and similar are v8 and will not compile).
- `lv_conf.h`: provide it in the project and point to it with build flags
  (`-D LV_CONF_INCLUDE_SIMPLE` + include path). Enable only the widgets and fonts used.
- **Do not allocate a full-screen buffer**: 320x240 at 16 bits is 150 KB. Use partial draw buffers
  (about 1/10 of the screen).
- Call `lv_timer_handler()` regularly (every ~5 ms) from the main loop and provide the LVGL tick
  (`lv_tick_set_cb` with `millis`). Never block the loop, or the GUI freezes.
- **TFT_eSPI is configured through `build_flags`** in `platformio.ini`
  (`-D USER_SETUP_LOADED`, driver define, pin defines, SPI frequency). Never edit files inside the
  library folder (`.pio/libdeps/`).
- Update widgets with sensor values only when a new value arrives, not every loop iteration.
- OLED (SSD1306) uses **U8g2**, not LVGL. Use a page buffer or full buffer constructor that fits in RAM.

### 14.5 Web app pitfalls

- Create the app with Vite (React + TypeScript template) inside `web/`.
- Dependencies: React, React Flow and what Vite installs. Ask before adding any other package.
- The catalog and the pin table are loaded from the `catalog/` JSON files (copied or imported at
  build time). Never duplicate the pin rules in TypeScript by hand: generate or load them from the
  same JSON as the Python validator.
- The UI must work with the browser only (no server). Export uses a file download.
- Keep the UI simple and readable; the demo matters more than visual polish.

### 14.6 LaTeX pitfalls

- **Escape special characters.** Pin and signal names contain `_` (`bme280_1`, `i2c_sda`), which
  breaks LaTeX. Always escape `_ & % # $ { }`. Generate LaTeX from Python with an escaping helper.
- Compile with `pdflatex` only. No `fontspec`, `minted`, XeLaTeX, LuaLaTeX or `--shell-escape`.
- Allowed packages: `geometry`, `graphicx`, `booktabs`, `longtable`, `tikz`, `listings`, `xcolor`,
  `hyperref`, `caption`. Ask before adding others.
- Compile twice with auxiliary files in `build/` and copy only the final PDF to `docs/`.

### 14.7 Repository hygiene

- The repository already contains the `.gitignore` and `.bobignore` files from the official
  IBM hackathon repository template. **Keep all their existing entries** and only append ours:
  - `.gitignore`: `node_modules/`, `web/dist/`, `.pio/`, `build/`, `__pycache__/`, `.venv/`,
    `*.aux`, `*.log`, `*.out`, `*.toc`, `*.synctex.gz`, `secrets.h`.
  - `.bobignore`: `node_modules/`, `.pio/`, `web/dist/`, `build/`, and large datasheet PDFs except
    when a skill explicitly needs one.
- **No credentials or secrets in the repository, ever** (IBM security monitoring suspends accounts
  that expose IBM Cloud credentials). PinPilot uses no API keys. WiFi credentials in generated
  firmware go in `include/secrets.h` (gitignored), with a committed `include/secrets.example.h`
  containing placeholders.
- Never modify or delete `docs/PROJECT_PINPILOT.md` or `bob_sessions/`.
- Do not commit or push unless the user asks. When asked, use small commits, one per phase,
  with conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`).

### 14.8 Working agreement (to save Bobcoins and avoid errors)

- **Plan first, then act.** At the start of each phase, list the files you will create or change
  and wait for approval.
- **Maximum 3 fix attempts** per failing build or test. Then stop, summarize the error, your
  hypotheses and what you tried, and ask the user.
- **Never invent tool output.** Every build result, test result or version number must come from
  actually running the command. If you cannot run it, say so.
- **Never invent component data.** Pinouts, I2C addresses and voltages come from the datasheet or
  the catalog. If unsure, mark the field as `"TODO: verify"` and tell the user.
- Prefer small, targeted edits over regenerating whole files.
- Do not open large generated files (full build logs, `node_modules`, `.pio`). Read only the
  relevant part.
- Stay within scope (section 12). Ideas outside the scope go into a "future work" list.
- **End every phase with a short report:** files created/changed, commands run and their results,
  acceptance criteria met, and open issues.
- **Append that report to `docs/BOB_USAGE_LOG.md`** (phase, Bob features used — modes, skills,
  subagents, document understanding —, what Bob produced, and any fix loops). This log is the
  source for the hackathon's "IBM Bob Usage Statement".

---

## 15. Hackathon deliverables (context for every phase)

The submission on lablab.ai requires the items below. Build with them in mind.

| Deliverable | Notes |
|---|---|
| Project title, short description, tags | Written by the user at the end |
| Long description — Problem & Solution Statement | **≤ 500 words**: problem, target users, how they interact, why it is new |
| IBM Bob Usage Statement | **≤ 500 words**: how and where Bob was used — built from `docs/BOB_USAGE_LOG.md` |
| Public code repository | Must include the code/files where Bob assisted |
| Bob task session summary screenshots | PNG files in `bob_sessions/` (the user captures them) |
| Application URL | The web app deployed on **GitHub Pages** (Vite `base` set to the repo name, deployed with a GitHub Actions workflow) |
| Video demo | MP4, **≤ 3 minutes**, at least **90 seconds of the solution in action**, narrated, showing clearly how Bob was used |
| Slide presentation and cover image | Prepared by the user at the end |

Judging criteria: **Application of Technology** (completeness and clear use of Bob),
**Presentation**, **Business Value** (impact on a high-priority problem) and **Originality**.
Prioritize a complete, demoable flow over extra features.
