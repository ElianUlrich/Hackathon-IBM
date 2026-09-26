import { Handle, Position } from '@xyflow/react';

interface Esp32NodeData {
  usedPins: { gpio: number; label: string }[];
}

export function Esp32Node({ data }: { data: Esp32NodeData }) {
  return (
    <div className="esp32-node">
      <div className="node-header">ESP32-WROOM-32</div>
      <div className="node-body">
        {data.usedPins.map(({ gpio, label }) => (
          <div key={gpio} className="pin-row">
            <span className="pin-label">{label}</span>
            <span className="pin-gpio">GPIO{gpio}</span>
            <Handle
              type="target"
              position={Position.Right}
              id={`gpio-${gpio}`}
              style={{ position: 'relative', right: 0, transform: 'none', top: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
