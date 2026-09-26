import type { ProjectState, ValidationResult, Issue } from '../types';
import { CATALOG } from '../data/components';

const OUTPUT_ROLES = new Set([
  'gpio_out', 'spi_mosi', 'spi_sck', 'spi_cs', 'i2c_sda', 'i2c_scl',
  'uart_tx', 'pwm', 'onewire',
]);

const FLASH_GPIOS = new Set([6, 7, 8, 9, 10, 11]);
const INPUT_ONLY_GPIOS = new Set([34, 35, 36, 39]);
const STRAPPING_GPIOS = new Set([0, 2, 5, 12, 15]);
const UART0_GPIOS = new Set([1, 3]);
const ADC2_GPIOS = new Set([0, 2, 4, 12, 13, 14, 15, 25, 26, 27]);

export function validate(project: ProjectState): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  // Collect all (instance_id, pin_name) -> gpio mappings
  const gpioUsage: Map<number, string[]> = new Map();

  for (const comp of project.components) {
    const def = CATALOG.find(d => d.id === comp.catalog_id);

    for (const [pinName, gpio] of Object.entries(comp.pin_mapping)) {
      // E1: Flash GPIO
      if (FLASH_GPIOS.has(gpio)) {
        errors.push({
          code: 'E1',
          message: `${comp.instance_id}/${pinName}: GPIO${gpio} is connected to the internal SPI flash and must not be used.`,
          suggestion: 'Choose a GPIO outside the range 6–11.',
        });
      }

      // E2: Output role on input-only pin
      const pinDef = def?.pins.find(p => p.name === pinName);
      if (pinDef && OUTPUT_ROLES.has(pinDef.role) && INPUT_ONLY_GPIOS.has(gpio)) {
        errors.push({
          code: 'E2',
          message: `${comp.instance_id}/${pinName}: GPIO${gpio} is input-only but the pin role "${pinDef.role}" requires output capability.`,
          suggestion: 'Use a GPIO with output capability (not 34, 35, 36, or 39).',
        });
      }

      // Track for E4 (duplicate GPIO) — only non-bus-shared pins
      // Bus pins (I2C SDA/SCL, SPI MOSI/MISO/SCK) are intentionally shared
      const isBusShared = pinDef && (
        ['i2c_sda', 'i2c_scl', 'spi_mosi', 'spi_miso', 'spi_sck'].includes(pinDef.role)
      );
      if (!isBusShared) {
        if (!gpioUsage.has(gpio)) gpioUsage.set(gpio, []);
        gpioUsage.get(gpio)!.push(`${comp.instance_id}/${pinName}`);
      }

      // E5: ADC2 + WiFi conflict
      if (project.app.wifi && def?.interface === 'adc' && pinDef?.role === 'adc' && ADC2_GPIOS.has(gpio)) {
        errors.push({
          code: 'E5',
          message: `${comp.instance_id}/${pinName}: GPIO${gpio} is an ADC2 pin and cannot be used for analog input when WiFi is enabled.`,
          suggestion: 'Move the sensor to an ADC1 pin: GPIO32, 33, 34, 35, 36, or 39.',
        });
      }

      // W1: Strapping pins
      if (STRAPPING_GPIOS.has(gpio)) {
        const note = gpio === 12
          ? 'GPIO12 HIGH at boot breaks flash voltage on most DevKit boards.'
          : 'This is a strapping pin; its state at boot may affect device startup.';
        warnings.push({
          code: 'W1',
          message: `${comp.instance_id}/${pinName}: GPIO${gpio} is a strapping pin. ${note}`,
        });
      }

      // W2: UART0 conflict
      if (UART0_GPIOS.has(gpio) && project.app.serial_logging) {
        warnings.push({
          code: 'W2',
          message: `${comp.instance_id}/${pinName}: GPIO${gpio} is used by UART0 (USB serial). This conflicts with serial logging.`,
          suggestion: 'Disable serial_logging or use different GPIO pins.',
        });
      }
    }

    // W3: 5V logic component
    if (def && def.logic_voltage !== undefined && def.logic_voltage > 3.3) {
      warnings.push({
        code: 'W3',
        message: `${comp.instance_id}: Logic voltage is ${def.logic_voltage}V but ESP32 GPIO is 3.3V. Direct connection may damage the ESP32.`,
        suggestion: 'Use a level shifter or voltage divider.',
      });
    }
  }

  // E3: I2C address collision
  const i2cAddressMap = new Map<string, string>();
  for (const comp of project.components) {
    if (comp.i2c_address !== undefined && comp.bus_id) {
      const key = `${comp.bus_id}:${comp.i2c_address}`;
      if (i2cAddressMap.has(key)) {
        errors.push({
          code: 'E3',
          message: `I2C address collision: ${comp.instance_id} and ${i2cAddressMap.get(key)} both use address 0x${comp.i2c_address.toString(16).toUpperCase()} on ${comp.bus_id}.`,
          suggestion: 'Change the I2C address of one component using its address-select pin.',
        });
      } else {
        i2cAddressMap.set(key, comp.instance_id);
      }
    }
  }

  // E4: Duplicate GPIO (non-bus-shared)
  for (const [gpio, users] of gpioUsage.entries()) {
    if (users.length > 1) {
      errors.push({
        code: 'E4',
        message: `GPIO${gpio} is assigned to multiple pins: ${users.join(', ')}.`,
        suggestion: 'Each non-shared GPIO must be assigned to exactly one function.',
      });
    }
  }

  return { errors, warnings };
}
