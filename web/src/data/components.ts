import type { ComponentDef } from '../types';

import bh1750 from '../../../catalog/components/bh1750.json';
import bme280 from '../../../catalog/components/bme280.json';
import ds18b20 from '../../../catalog/components/ds18b20.json';
import ili9341 from '../../../catalog/components/ili9341.json';
import relay_module from '../../../catalog/components/relay_module.json';
import soil_moisture_v12 from '../../../catalog/components/soil_moisture_v12.json';
import ssd1306 from '../../../catalog/components/ssd1306.json';

export const CATALOG: ComponentDef[] = [
  bh1750,
  bme280,
  ds18b20,
  ili9341,
  relay_module,
  soil_moisture_v12,
  ssd1306,
] as ComponentDef[];
