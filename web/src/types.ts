// ─── Component catalog types ───────────────────────────────────────────────

export interface ComponentPin {
  name: string;
  role: string;
  notes?: string;
}

export interface Measurement {
  name: string;
  unit: string;
  range_min?: number;
  range_max?: number;
}

export interface I2cAddresses {
  default: number;
  alternatives?: { address: number; how: string }[];
}

export interface Library {
  platformio_id: string;
  version: string;
}

export interface ComponentDef {
  id: string;
  name: string;
  category?: string;
  description?: string;
  interface: 'i2c' | 'spi' | 'uart' | 'onewire' | 'adc' | 'gpio';
  supply_voltage?: number;
  logic_voltage?: number;
  i2c_addresses?: I2cAddresses;
  pins: ComponentPin[];
  measurements?: Measurement[];
  min_read_interval_ms?: number;
  libraries: Library[];
  datasheet_url?: string;
}

// ─── ESP32 pin table types ──────────────────────────────────────────────────

export interface PinDef {
  input: boolean;
  output: boolean;
  adc1: boolean;
  adc2: boolean;
  dac: boolean;
  touch: boolean;
  pullup: boolean;
  pulldown: boolean;
  flags: string[];
  notes: string;
}

// ─── Project state types ────────────────────────────────────────────────────

export interface ComponentInstance {
  instance_id: string;
  catalog_id: string;
  pin_mapping: Record<string, number>;
  i2c_address?: number;
  bus_id?: string;
}

export interface BusI2c {
  sda: number;
  scl: number;
  frequency?: number;
}

export interface BusSpi {
  mosi: number;
  miso: number;
  sck: number;
  frequency?: number;
}

export interface Buses {
  i2c0?: BusI2c;
  spi0?: BusSpi;
}

export interface ScreenWidget {
  id: string;
  type: 'value' | 'label' | 'bar' | 'arc' | 'chart';
  binding: string;
  label: string;
  unit: string;
  x: number;
  y: number;
}

export interface ScreenConfig {
  instance_id: string;
  driver: string;
  widgets: ScreenWidget[];
}

export interface AppConfig {
  wifi: boolean;
  serial_logging: boolean;
  ota: boolean;
}

export interface ProjectState {
  board: 'esp32dev';
  components: ComponentInstance[];
  buses: Buses;
  screen?: ScreenConfig;
  app: AppConfig;
}

// ─── Validation types ───────────────────────────────────────────────────────

export interface Issue {
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}
