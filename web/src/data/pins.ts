import type { PinDef } from '../types';
import rawPins from '../../../catalog/esp32_devkit_pins.json';

export const ESP32_PINS: Record<number, PinDef> = Object.fromEntries(
  Object.entries(rawPins).map(([k, v]) => [parseInt(k, 10), v as PinDef])
);
