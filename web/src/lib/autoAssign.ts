import type { ComponentDef, ComponentInstance, ProjectState } from '../types';
import { ESP32_PINS } from '../data/pins';

// Fixed bus pins
const I2C_SDA = 21;
const I2C_SCL = 22;
const SPI_MOSI = 23;
const SPI_MISO = 19;
const SPI_SCK = 18;

// ADC1 pins (safe with WiFi): 32,33,34,35,36,39
const ADC1_PINS = [32, 33, 34, 35, 36, 39];
// ADC2 pins (blocked when WiFi active)
const ADC2_PINS = [0, 2, 4, 12, 13, 14, 15, 25, 26, 27];

// Free GPIO priority list for CS/DC/RESET/digital/onewire
// Avoids flash (6-11), input-only (34-39), UART0 (1,3), I2C (21,22), VSPI (18,19,23)
const FREE_GPIO_PRIORITY = [27, 26, 25, 5, 17, 16, 15, 14, 13, 4, 2, 0];

function isUsable(gpio: number, usedPins: Set<number>): boolean {
  if (usedPins.has(gpio)) return false;
  const p = ESP32_PINS[gpio];
  if (!p) return false;
  if (p.flags.includes('flash')) return false;
  return true;
}

function pickFreeOutput(usedPins: Set<number>, extraExcludes: number[] = []): number | null {
  for (const gpio of FREE_GPIO_PRIORITY) {
    if (extraExcludes.includes(gpio)) continue;
    if (!isUsable(gpio, usedPins)) continue;
    const p = ESP32_PINS[gpio];
    if (p && p.output) return gpio;
  }
  return null;
}

function pickFreeAdc(usedPins: Set<number>, wifiEnabled: boolean): number | null {
  const candidates = wifiEnabled
    ? ADC1_PINS
    : [...ADC1_PINS, ...ADC2_PINS];
  for (const gpio of candidates) {
    if (!isUsable(gpio, usedPins)) continue;
    const p = ESP32_PINS[gpio];
    if (p && p.input) return gpio;
  }
  return null;
}

let instanceCounter: Record<string, number> = {};

function makeInstanceId(catalogId: string): string {
  instanceCounter[catalogId] = (instanceCounter[catalogId] ?? 0) + 1;
  return `${catalogId}_${instanceCounter[catalogId]}`;
}

export function autoAssign(
  defs: ComponentDef[],
  catalogIds: string[],
  wifi: boolean
): ProjectState {
  instanceCounter = {};

  const usedPins = new Set<number>();
  // Reserve fixed bus pins upfront
  [I2C_SDA, I2C_SCL, SPI_MOSI, SPI_MISO, SPI_SCK].forEach(p => usedPins.add(p));

  const instances: ComponentInstance[] = [];
  let needsI2c = false;
  let needsSpi = false;

  for (const catalogId of catalogIds) {
    const def = defs.find(d => d.id === catalogId);
    if (!def) continue;

    const instance_id = makeInstanceId(catalogId);
    const pin_mapping: Record<string, number> = {};
    let bus_id: string | undefined;
    let i2c_address: number | undefined;

    if (def.interface === 'i2c') {
      needsI2c = true;
      bus_id = 'i2c0';
      // Assign SDA/SCL (shared, don't add to usedPins again as they're already reserved)
      for (const pin of def.pins) {
        if (pin.role === 'i2c_sda') pin_mapping[pin.name] = I2C_SDA;
        else if (pin.role === 'i2c_scl') pin_mapping[pin.name] = I2C_SCL;
      }
      i2c_address = def.i2c_addresses?.default;
    } else if (def.interface === 'spi') {
      needsSpi = true;
      bus_id = 'spi0';
      for (const pin of def.pins) {
        if (pin.role === 'spi_mosi') pin_mapping[pin.name] = SPI_MOSI;
        else if (pin.role === 'spi_miso') pin_mapping[pin.name] = SPI_MISO;
        else if (pin.role === 'spi_sck') pin_mapping[pin.name] = SPI_SCK;
        else if (pin.role === 'spi_cs' || pin.role === 'gpio_out') {
          const gpio = pickFreeOutput(usedPins);
          if (gpio !== null) {
            pin_mapping[pin.name] = gpio;
            usedPins.add(gpio);
          }
        }
      }
    } else if (def.interface === 'adc') {
      for (const pin of def.pins) {
        if (pin.role === 'adc') {
          const gpio = pickFreeAdc(usedPins, wifi);
          if (gpio !== null) {
            pin_mapping[pin.name] = gpio;
            usedPins.add(gpio);
          }
        }
      }
    } else if (def.interface === 'onewire' || def.interface === 'gpio') {
      for (const pin of def.pins) {
        if (pin.role === 'onewire' || pin.role === 'gpio_out' || pin.role === 'gpio_in') {
          const gpio = pickFreeOutput(usedPins);
          if (gpio !== null) {
            pin_mapping[pin.name] = gpio;
            usedPins.add(gpio);
          }
        }
      }
    }

    instances.push({
      instance_id,
      catalog_id: catalogId,
      pin_mapping,
      ...(i2c_address !== undefined ? { i2c_address } : {}),
      ...(bus_id ? { bus_id } : {}),
    });
  }

  const buses: any = {};
  if (needsI2c) buses.i2c0 = { sda: I2C_SDA, scl: I2C_SCL, frequency: 400000 };
  if (needsSpi) buses.spi0 = { mosi: SPI_MOSI, miso: SPI_MISO, sck: SPI_SCK, frequency: 40000000 };

  return {
    board: 'esp32dev',
    components: instances,
    buses,
    app: { wifi, serial_logging: true, ota: false },
  };
}

/** Re-run assignment when wifi flag changes, preserving instance order */
export function reAssign(current: ProjectState, defs: ComponentDef[], wifi: boolean): ProjectState {
  const catalogIds = current.components.map(c => c.catalog_id);
  return autoAssign(defs, catalogIds, wifi);
}
