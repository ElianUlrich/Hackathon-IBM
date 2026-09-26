import type { ComponentDef } from '../types';
import { CATALOG } from '../data/components';

interface SidebarProps {
  onAdd: (catalogId: string) => void;
  onLoadExample: (name: string) => void;
  onExport: () => void;
}

const INTERFACE_COLOR: Record<string, string> = {
  i2c: '#3b82d4',
  spi: '#7c5cd8',
  adc: '#e08a00',
  gpio: '#2a9d5c',
  onewire: '#c0392b',
  uart: '#555',
};

export function Sidebar({ onAdd, onLoadExample, onExport }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">PinPilot</h2>
      <p className="sidebar-sub">ESP32 Pin Configurator</p>

      <div className="sidebar-section">
        <h3>Load Example</h3>
        <button className="btn btn-outline" onClick={() => onLoadExample('weather_station')}>
          Weather Station
        </button>
        <button className="btn btn-outline" onClick={() => onLoadExample('smart_farm')}>
          Smart Farm Node
        </button>
        <button className="btn btn-outline btn-warn" onClick={() => onLoadExample('invalid')}>
          Invalid (ADC2+WiFi)
        </button>
      </div>

      <div className="sidebar-section">
        <h3>Component Catalog</h3>
        {CATALOG.map((def: ComponentDef) => (
          <div key={def.id} className="catalog-item">
            <div className="catalog-item-header">
              <span className="catalog-name">{def.name}</span>
              <span
                className="iface-badge"
                style={{ backgroundColor: INTERFACE_COLOR[def.interface] ?? '#888' }}
              >
                {def.interface}
              </span>
            </div>
            <button className="btn btn-add" onClick={() => onAdd(def.id)}>
              + Add
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <button className="btn btn-primary" onClick={onExport}>
          ↓ Export project.json
        </button>
      </div>
    </aside>
  );
}
