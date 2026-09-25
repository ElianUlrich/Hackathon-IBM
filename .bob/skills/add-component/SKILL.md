---
name: add-component
description: Use when adding a new component to the catalog, importing a component from a datasheet, or creating a catalog JSON entry from a PDF datasheet.
---

# Add Component from Datasheet

Follow these steps to turn a component datasheet into a validated catalog JSON entry.

## Step 1 — Gather inputs

Ask the user (use `ask_followup_question`):
1. The datasheet file path (PDF in the workspace).
2. The component's primary interface type (`i2c`, `spi`, `uart`, `gpio`, `adc`, `onewire`, `pwm`).
3. The desired `id` (snake_case, e.g. `mpu6050`) — suggest one based on the component name.

## Step 2 — Read the datasheet

Use `read_file` on the PDF to extract:
- Full component name and manufacturer.
- Supply voltage range — record the value suitable for the ESP32 context (3.3V or 5V).
- Logic voltage (the signal level on I/O pins).
- Pin list: every pin's name (as printed on the package/module), function, and direction.
- I2C addresses (default and any alternatives with the condition to select them).
- SPI mode, max clock frequency (if SPI).
- Minimum recommended read interval (for sensors; 0 for actuators/displays).
- Any critical wiring notes (pull-up requirements, power sequencing, decoupling caps).

If any field cannot be determined from the datasheet, mark it `"TODO: verify"` and note it
in your final report. **Never invent electrical values.**

## Step 3 — Map pins to catalog roles

For each pin, assign a role from this enum (defined in `catalog/component.schema.json`):

| Role | Use for |
|------|---------|
| `vcc` | Power supply pin |
| `gnd` | Ground pin |
| `i2c_sda` | I2C data line |
| `i2c_scl` | I2C clock line |
| `spi_mosi` | SPI MOSI |
| `spi_miso` | SPI MISO |
| `spi_sck` | SPI clock |
| `spi_cs` | SPI chip select |
| `gpio_in` | Digital input from ESP32 |
| `gpio_out` | Digital output from ESP32 |
| `adc` | Analog output to ESP32 ADC pin |
| `onewire` | 1-Wire data line |
| `uart_tx` | UART transmit (from component) |
| `uart_rx` | UART receive (into component) |
| `i2s_bck` | I2S bit clock |
| `i2s_ws` | I2S word select |
| `i2s_data` | I2S data |
| `pwm` | PWM input |
| `config` | Pin tied to GND or VCC for configuration — never wired to ESP32 GPIO |

Use `"config"` for address-select pins (e.g. BH1750 ADDR, MPU6050 AD0 when permanently strapped).

## Step 4 — Identify the PlatformIO library

Search your knowledge for the standard Arduino/PlatformIO library for this component.
Format: `"author/Library Name"` as used in `lib_deps`.

- If confirmed: use it. Set version to the latest stable semver range (e.g. `"^2.0.0"`).
  Mark as `"TODO: verify"` — version must be confirmed by an actual successful build in Phase 4.
- If no library is needed (pure `digitalWrite`/`analogRead`): use `"libraries": []`.
- If uncertain: use `"TODO: verify"` for the `platformio_id` and note it in the report.

**Never invent a library name you are not confident about.**

## Step 5 — Write the catalog entry

Write to `catalog/components/<id>.json` following the schema in `catalog/component.schema.json`.

Template:
```json
{
  "id": "<id>",
  "name": "<Full Component Name>",
  "category": "<sensor|actuator|display|audio>",
  "description": "<one sentence describing what it does>",
  "interface": "<i2c|spi|uart|gpio|adc|onewire|pwm>",
  "supply_voltage": <number>,
  "logic_voltage": <number>,
  "i2c_addresses": {
    "default": <integer 0-127>,
    "alternatives": [
      { "address": <integer>, "how": "<how to select>" }
    ]
  },
  "pins": [
    { "name": "<PIN_NAME>", "role": "<role>", "notes": "<optional>" }
  ],
  "measurements": [
    { "name": "<key>", "unit": "<unit>", "range_min": <n>, "range_max": <n> }
  ],
  "min_read_interval_ms": <integer>,
  "libraries": [
    { "platformio_id": "<author/Name>", "version": "<^x.y.z or TODO: verify>" }
  ],
  "notes": "<wiring tips, caveats, pull-up requirements>",
  "datasheet_url": "<url if available>"
}
```

Omit `i2c_addresses` if the component is not I2C.
Omit `measurements` array entries if the component is an actuator with no readable output.
Omit `datasheet_url` if not available.

## Step 6 — Validate the JSON

Run this command to confirm the file parses:
```
python -c "import json,sys; json.load(open(sys.argv[1]))" catalog/components/<id>.json
```

If parsing fails, fix the JSON syntax error and re-run.

## Step 7 — Report

Tell the user:
- The file written: `catalog/components/<id>.json`
- Any fields marked `"TODO: verify"` (list them with the reason)
- Any electrical values that could not be determined from the datasheet
- Recommended next step: confirm the library version in Phase 4 by running an actual build
