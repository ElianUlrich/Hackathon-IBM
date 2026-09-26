# PinPilot 🛩️ — from sensors to verified ESP32 firmware, with IBM Bob

**Pick your sensors, get correct wiring, compiled firmware and documentation — in minutes, not days.**

🌐 **Live app:** https://elianulrich.github.io/Hackathon-IBM/
🎥 **Demo video:** _add link_
🏆 Built for the **IBM Bob 2.0 Hackathon** (lablab.ai, September 2026)

---

## The problem

Starting an ESP32 project with a few sensors and a display is slow and error-prone,
even for experienced embedded developers:

- **Wiring traps.** The classic ESP32 has input-only pins, strapping pins that break boot,
  flash pins, and ADC2 channels that silently stop working when WiFi is on.
  These bugs only show up on the bench, after hours of debugging.
- **Protocol setup.** Shared I2C buses, address conflicts, SPI chip selects and library
  configuration have to be worked out by hand from several datasheets.
- **Display setup.** Getting an LVGL touchscreen running (drivers, buffers, `lv_conf.h`,
  tick handling) can take a day on its own.
- **No documentation.** Wiring tables and pin maps are rarely written down.

Embedded developers typically spend **20–40% of their time debugging**, and many of those
hours come from configuration and wiring mistakes that could be caught before writing any code.

## The solution

PinPilot has two parts that work together:

### 1. Visual configurator (web app)
- A **catalog of common market components** (BME280, BH1750, DS18B20, capacitive soil
  moisture sensor, relay module, SSD1306 OLED, ILI9341 TFT), described as data.
- **Automatic pin assignment** following ESP32 best practices
  (I2C 21/22, VSPI 23/19/18, analog sensors only on ADC1, free GPIOs for CS/DC/RESET).
- **Real-time validation** with a single source of truth for pin capabilities
  (`catalog/esp32_devkit_pins.json`): flash pins, input-only pins, strapping pins,
  I2C address conflicts, duplicated GPIOs, and **ADC2 + WiFi conflicts**.
- **⚡ Auto-fix pins**: one click re-assigns the pins and clears the errors.
- Wiring table, display value selection, and **export to `project.json`**.

### 2. IBM Bob as the firmware engineer
The exported `project.json` is opened in **IBM Bob IDE**, where PinPilot's custom modes and
skills turn it into a **verified PlatformIO project** and its documentation:

| Custom mode | Role |
|---|---|
| **ESP32 Architect** | Reads the project and the catalog, plans the firmware (read-only) |
| **Firmware Dev** | Generates the firmware with **2 parallel subagents** (drivers / display) and runs the first build |
| **Build Fixer** | Takes over automatically if the build fails; max 3 attempts, then stops and reports |
| **Tech Writer** | Generates the LaTeX documentation and compiles the PDF |

| Skill | What it does |
|---|---|
| `generate-firmware` | `project.json` → PlatformIO project (non-blocking loop, `pinmap.h`, one module per component) |
| `lvgl-screen` | Display block → LVGL v9 (TFT) or U8g2 (OLED) code |
| `project-docs` | `project.json` → LaTeX document (block diagram, wiring table, pin map) → PDF |
| `add-component` | Datasheet PDF → new catalog entry, validated against the schema |

**Key principle: no firmware is presented as working unless it actually compiled.**

## Results

| Demo | Components | Build | RAM | Flash |
|---|---|---|---|---|
| **Weather station** | BME280 + BH1750 + SSD1306 OLED (all I2C) | ✅ passed on attempt 1 | 7.1% | 23.4% |
| **Smart farm node** | Soil moisture (ADC1) + DS18B20 + BME280 + relay + ILI9341 with **LVGL 9 dashboard** | ✅ passed on attempt 2 (Build Fixer fixed an LVGL tick callback type error) | 29.0% | 41.2% |

The smart farm node also ships with a generated 5-page PDF: `docs/smart_farm_node.pdf`.

The validator catches the intentional mistakes in the example projects:

| Example | Result |
|---|---|
| `weather_station/project.json` | ✅ 0 errors, 0 warnings |
| `smart_farm_node/project.json` | ✅ 0 errors, 0 warnings |
| `project_invalid_adc2_wifi.json` | ❌ soil sensor on GPIO25 (ADC2) with WiFi enabled |
| `project_invalid_gpio_conflict.json` | ❌ GPIO26 used by both `relay_1.IN` and `ds18b20_1.DQ` |

## Impact

| Task | Manual (estimate) | With PinPilot |
|---|---|---|
| Choose pins and check ESP32 constraints | 30–60 min | Instant, automatic |
| Find ADC2/WiFi or pin conflicts | Often only on the bench, hours | Before any code is written |
| Set up libraries, I2C/SPI and drivers | 1–3 h | Generated |
| Get an LVGL 9 dashboard compiling | Half a day or more | Generated and compiled by Bob |
| Write wiring and pin documentation | 1 h (often skipped) | Generated PDF |

_Manual times are estimates from typical embedded workflows, not a controlled study._

## Quick start

1. Open the **[live app](https://elianulrich.github.io/Hackathon-IBM/)**, load an example or add components, and click **Export project.json**.
2. Clone this repo and open it in **IBM Bob IDE**; the custom modes and skills load from `.bob/`.
3. Select the **Firmware Dev** mode and ask: _"Use the generate-firmware skill for examples/&lt;project&gt;/project.json"_.
4. Select the **Tech Writer** mode and ask: _"Use the project-docs skill for examples/&lt;project&gt;/project.json"_.

Requirements: Node.js, Python 3, PlatformIO Core (`pip install platformio`), and a LaTeX
distribution with `pdflatex` (e.g. MiKTeX). Validate any project with
`python scripts/validate_project.py <project.json>`.

## Repository structure

```
.bob/                  Custom modes, rules and skills for IBM Bob
catalog/               Component catalog (JSON) + ESP32 DevKit pin table
schema/                project.json schema
scripts/               validate_project.py, build.py, generate_docs.py
web/                   React + Vite + React Flow configurator (deployed to GitHub Pages)
examples/              Demo projects and their generated firmware
docs/                  Specification, plans, Bob usage log, generated PDF
bob_sessions/          IBM Bob task session summary screenshots
```

## How IBM Bob was used

IBM Bob built this project phase by phase, from a written specification: planning in
Plan mode, the catalog and validator, the custom modes and skills, the web app and its
GitHub Pages deployment, both firmware projects, and the LaTeX documentation generator.
Every phase is logged in [`docs/BOB_USAGE_LOG.md`](docs/BOB_USAGE_LOG.md), and the task
session summaries are in [`bob_sessions/`](bob_sessions/).

_Transparency note: the project specification and this README were drafted with the help
of another AI assistant (Claude). All code, configuration, firmware and generated
documentation in this repository were produced with IBM Bob._

## Roadmap

- More ESP32 variants (S3, C3, C6) using the same pin-table format
- Free-form screen designer for LVGL dashboards
- Export to a Wokwi `diagram.json` for in-browser simulation
- Auto-irrigation logic templates for the smart farm node
