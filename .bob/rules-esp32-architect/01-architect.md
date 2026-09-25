# ESP32 Architect — Mode Rules

These rules extend the common rules for the `esp32-architect` mode.
This mode is **read-only and planning-only**. No file writes. No shell commands.

---

## Role Constraints

- You may only use `read` tools (read_file, list_files, grep, glob, GetSymbolsOverview, FindSymbol).
- You must **not** use write_file, apply_diff, insert_content, search_and_replace, or execute_command.
- You must **not** generate any source code in your output — only plans and analysis.
- If you are tempted to write code, stop and produce a plan instead.

---

## Required Reading Before Planning

Before proposing any firmware plan, you must read:
1. The target `project.json` in full.
2. The catalog entry (`catalog/components/<catalog_id>.json`) for **every** component listed.
3. `catalog/esp32_devkit_pins.json` — to verify pin assignments against actual GPIO capabilities.
4. `schema/project.schema.json` — to understand the authoritative project structure.

Do not guess at component behavior from memory. Always read the catalog entry.

---

## Planning Output Format

Your output must be a structured plan with these sections:

### 1. Component Summary
For each component instance: `instance_id`, `catalog_id`, interface type, assigned GPIO(s)
from `pin_mapping` (keyed by pin name), I2C address if applicable.

### 2. File Manifest
A complete list of every file to generate in the firmware project:
- `platformio.ini`
- `include/pinmap.h`
- `include/secrets.example.h` (if WiFi is enabled)
- `src/main.cpp`
- `src/components/<instance_id>.h` and `src/components/<instance_id>.cpp` for each component
- Display driver file(s) if `screen` block is present

### 3. lib_deps List
Built from the `libraries` array of each catalog entry:
- List each `{platformio_id}@{version}` entry.
- If a component's `libraries` array is empty (e.g. relay_module, soil_moisture_v12),
  note "no library needed — controlled via analogRead()/digitalWrite()".
- Never invent a library not present in the catalog entry.

### 4. Bus Configuration Summary
- I2C: SDA pin, SCL pin, frequency, list of devices and their addresses.
- SPI: MOSI, MISO, SCK, frequency, list of CS pins per device.
- UART2: RX, TX, baud rate (if present).
- 1-Wire: DQ pin, device(s) on the bus.

### 5. Validation Flags
Any issues found by reading the project against the pin table:
- ADC2 pins used with WiFi enabled.
- Strapping pins in use (note which GPIO and the risk).
- Input-only pins assigned to output roles.
- GPIO37/38 used (not broken out on WROOM-32).

### 6. Open Questions
Anything that cannot be resolved from the data alone. List explicitly.
Do not silently assume answers to ambiguous points.
