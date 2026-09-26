import { Handle, Position } from '@xyflow/react';
import { ESP32_PINS } from '../data/pins';

// Shared-bus pin roles that are always read-only
const SHARED_BUS_ROLES = new Set([
  'i2c_sda', 'i2c_scl',
  'spi_mosi', 'spi_miso', 'spi_sck',
]);

// All valid assignable GPIO numbers from the pin table
const ALL_GPIOS = Object.keys(ESP32_PINS).map(Number).sort((a, b) => a - b);

interface PinEntry {
  name: string;
  gpio: number;
  role: string;
}

interface ComponentNodeData {
  label: string;
  iface: string;
  pins: PinEntry[];
  instanceId: string;
  onDelete: () => void;
  onPinChange: (pinName: string, gpio: number) => void;
}

export function ComponentNode({ data }: { data: ComponentNodeData }) {
  return (
    <div className="component-node">
      <div className="node-header">
        <span style={{ flex: 1 }}>{data.label}</span>
        <span className={`iface-badge iface-${data.iface}`}>{data.iface}</span>
        <button
          className="node-delete-btn"
          title="Remove component"
          onClick={data.onDelete}
        >
          ×
        </button>
      </div>
      <div className="node-body">
        {data.pins.map(({ name, gpio, role }) => {
          const readOnly = SHARED_BUS_ROLES.has(role);
          return (
            <div key={name} className="pin-row">
              <Handle
                type="source"
                position={Position.Left}
                id={`${data.instanceId}-${name}`}
                style={{ position: 'relative', left: 0, transform: 'none', top: 0 }}
              />
              <span className="pin-label">{name}</span>
              {readOnly ? (
                <span className="pin-gpio">GPIO{gpio}</span>
              ) : (
                <select
                  className="pin-select"
                  value={gpio}
                  onChange={e => data.onPinChange(name, parseInt(e.target.value, 10))}
                >
                  {ALL_GPIOS.map(g => (
                    <option key={g} value={g}>GPIO{g}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
