import { useState } from 'react';
import type { ProjectState, ScreenWidget } from '../types';
import { CATALOG } from '../data/components';

interface DisplayPanelProps {
  project: ProjectState;
  onChange: (screen: ProjectState['screen']) => void;
}

const DISPLAY_IDS = new Set(['ssd1306', 'ili9341']);

export function DisplayPanel({ project, onChange }: DisplayPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(project.screen?.widgets.map(w => w.binding) ?? [])
  );

  const displayCompMaybe = project.components.find(c => DISPLAY_IDS.has(c.catalog_id));
  if (!displayCompMaybe) return null;
  const displayComp = displayCompMaybe;

  const isSsd = displayComp.catalog_id === 'ssd1306';
  const yStep = isSsd ? 16 : 30;
  const driver = isSsd ? 'ssd1306' : 'ili9341';
  const def = CATALOG.find(d => d.id === displayComp.catalog_id);

  // Collect available measurements from non-display sensors
  const available: { binding: string; label: string; unit: string }[] = [];
  for (const comp of project.components) {
    if (DISPLAY_IDS.has(comp.catalog_id)) continue;
    const compDef = CATALOG.find(d => d.id === comp.catalog_id);
    if (!compDef?.measurements) continue;
    for (const m of compDef.measurements) {
        available.push({
          binding: `${comp.instance_id}.${m.name}`,
          label: `${comp.instance_id} · ${m.name}`,
          unit: m.unit,
        });
      }
  }

  function handleToggle(binding: string) {
    const next = new Set(selected);
    if (next.has(binding)) next.delete(binding);
    else next.add(binding);
    setSelected(next);

    const widgets: ScreenWidget[] = [...next].map((b, idx) => {
      const entry = available.find(a => a.binding === b);
      return {
        id: `widget_${idx}`,
        type: 'value',
        binding: b,
        label: entry?.label ?? b,
        unit: entry?.unit ?? '',
        x: 0,
        y: idx * yStep,
      };
    });

    onChange({
      instance_id: displayComp.instance_id,
      driver,
      widgets,
    });
  }

  return (
    <div className="panel-section">
      <h3>Display — {def?.name ?? displayComp.catalog_id}</h3>
      <p className="hint">Select sensor values to show:</p>
      {available.length === 0 && <p className="hint">No sensors with measurements added yet.</p>}
      {available.map(({ binding, label, unit }) => (
        <label key={binding} className="toggle-label">
          <input
            type="checkbox"
            checked={selected.has(binding)}
            onChange={() => handleToggle(binding)}
          />
          <span>
            {label} <span className="hint">({unit})</span>
          </span>
        </label>
      ))}
    </div>
  );
}
