# PinPilot — Common Rules (all modes)

These rules apply to every PinPilot mode. They encode the current schema facts,
platform constraints, working agreement, and repository hygiene rules from
docs/PROJECT_PINPILOT.md §14 and the Phase 1 corrections.

---

## 1. Schema Facts (Phase 1 corrections — authoritative)

### project.json — pin_mapping
- `pin_mapping` keys are **component pin names** as printed on the breakout board
  (e.g. `"CS"`, `"DC"`, `"RESET"`, `"SDA"`, `"SCL"`, `"DQ"`, `"AOUT"`, `"IN"`).
- They are NOT role strings. Never use `"i2c_sda"`, `"gpio_out"`, `"spi_cs"` etc. as keys.
- This allows components like ILI9341 (where DC and RESET are both `gpio_out`) to have
  both pins represented without key collision.

### catalog entries — libraries
- Each catalog entry uses a `"libraries"` **array** of objects: `[{"platformio_id": "...", "version": "..."}]`.
- The old `"library"` single-object field no longer exists. Do not use it.
- If a component needs no library (relay, soil sensor), `"libraries"` is an empty array `[]`.
- DS18B20 requires two entries: OneWire AND DallasTemperature.

### ESP32-WROOM-32 valid GPIO set
Valid GPIOs broken out on the DevKit: `0-19, 21-23, 25-27, 32-36, 39`.
- GPIO 37 and 38 exist on the die but are **NOT broken out** on WROOM-32 or standard DevKit boards.
- GPIO 6-11 are connected to the internal SPI flash and must never be used.
- GPIO 34, 35, 36, 39 are **input-only** (no output, no internal pull-ups).

### ADC channels
- ADC1 pins (safe with WiFi): GPIO 32, 33, 34, 35, 36, 39.
- ADC2 pins (blocked when WiFi is active): GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27.
- **GPIO 25 and 26 are ADC2, not ADC1.** They carry `adc2_wifi_conflict`.
- When `app.wifi = true`, never assign an ADC sensor to any ADC2 pin.

### catalog pin roles enum
Valid values: `vcc`, `gnd`, `i2c_sda`, `i2c_scl`, `spi_mosi`, `spi_miso`, `spi_sck`,
`spi_cs`, `gpio_in`, `gpio_out`, `adc`, `onewire`, `uart_tx`, `uart_rx`,
`i2s_bck`, `i2s_ws`, `i2s_data`, `pwm`, `config`.
Use `"config"` for pins that are tied to GND/VCC and never wired to the ESP32
(e.g. BH1750 ADDR address-select resistor).

---

## 2. Windows / PowerShell Rules

- The workspace runs on **Windows 11 / PowerShell**. Never write Bash scripts.
- All automation goes in Python scripts in `scripts/` using `pathlib` and
  `subprocess.run([...], ...)` with argument lists — never shell strings.
- Do **not** chain commands with `&&`. Run one command at a time and wait for output.
- Run commands from the repository root unless a step explicitly says otherwise.
- Do not install software or modify PATH. Assume the user has installed all required tools.

---

## 3. Working Agreement

- **Plan first.** List files to create/change and wait for approval before writing code,
  unless the current task is explicitly an implementation task with an approved plan.
- **Maximum 3 build-fix attempts total** across firmware-dev (attempt 1) and build-fixer
  (attempts 2 and 3). After attempt 3 fails: stop, summarize errors and hypotheses, ask user.
- **Never invent tool output.** Every build result, test result, or version number must come
  from actually running the command. If you cannot run it, say so.
- **Never invent component data.** Pinouts, I2C addresses, and voltages come from the
  datasheet or the catalog. If unsure, mark the field as `"TODO: verify"` and tell the user.
- Prefer small, targeted edits over regenerating whole files.
- Do not open large generated files (full build logs, `node_modules/`, `.pio/`). Read only
  the relevant part (first error block, specific file section).
- **End every phase with a short report** and **append it to `docs/BOB_USAGE_LOG.md`**:
  Bob features used, files created/changed, commands run and results, acceptance criteria met,
  open issues.

---

## 4. Repository Hygiene

- Do **not** commit or push unless the user explicitly asks.
- When asked: small commits, one per phase, conventional messages (`feat:`, `fix:`, `docs:`, `test:`).
- **No secrets or credentials in the repository, ever.**
  WiFi credentials in generated firmware go in `include/secrets.h` (gitignored).
  Commit only `include/secrets.example.h` with placeholder values.
- **Never modify or delete** `docs/PROJECT_PINPILOT.md` or the `bob_sessions/` directory.
- `build/` is not committed (LaTeX outputs only). `.pio/` is not committed.
