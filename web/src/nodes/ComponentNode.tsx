import { Handle, Position } from '@xyflow/react';

interface PinEntry {
  name: string;
  gpio: number;
}

interface ComponentNodeData {
  label: string;
  iface: string;
  pins: PinEntry[];
  instanceId: string;
}

export function ComponentNode({ data }: { data: ComponentNodeData }) {
  return (
    <div className="component-node">
      <div className="node-header">
        {data.label}
        <span className={`iface-badge iface-${data.iface}`}>{data.iface}</span>
      </div>
      <div className="node-body">
        {data.pins.map(({ name, gpio }) => (
          <div key={name} className="pin-row">
            <Handle
              type="source"
              position={Position.Left}
              id={`${data.instanceId}-${name}`}
              style={{ position: 'relative', left: 0, transform: 'none', top: 0 }}
            />
            <span className="pin-label">{name}</span>
            <span className="pin-gpio">GPIO{gpio}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
