import { useState } from 'react';
import type { ProjectState } from './types';
import { CATALOG } from './data/components';
import { autoAssign, reAssign } from './lib/autoAssign';
import { validate } from './lib/validator';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { RightPanel } from './components/RightPanel';
import { DisplayPanel } from './components/DisplayPanel';
import './App.css';

// Static imports for example projects
import weatherStation from '../../examples/weather_station/project.json';
import smartFarm from '../../examples/smart_farm_node/project.json';
import invalidExample from '../../examples/smart_farm_node/project_invalid_adc2_wifi.json';

const EMPTY_PROJECT: ProjectState = {
  board: 'esp32dev',
  components: [],
  buses: {},
  app: { wifi: false, serial_logging: true, ota: false },
};

export default function App() {
  const [project, setProject] = useState<ProjectState>(EMPTY_PROJECT);

  const validation = validate(project);

  function handleAdd(catalogId: string) {
    const currentIds = project.components.map(c => c.catalog_id);
    const newIds = [...currentIds, catalogId];
    const next = autoAssign(CATALOG, newIds, project.app.wifi);
    // Preserve screen config if still valid
    if (project.screen) next.screen = project.screen;
    setProject(next);
  }

  function handleLoadExample(name: string) {
    if (name === 'weather_station') setProject(weatherStation as unknown as ProjectState);
    else if (name === 'smart_farm') setProject(smartFarm as unknown as ProjectState);
    else if (name === 'invalid') setProject(invalidExample as unknown as ProjectState);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleWifiToggle(val: boolean) {
    const next = reAssign({ ...project, app: { ...project.app, wifi: val } }, CATALOG, val);
    if (project.screen) next.screen = project.screen;
    setProject(next);
  }

  function handleAutoFix() {
    const catalogIds = project.components.map(c => c.catalog_id);
    const next = autoAssign(CATALOG, catalogIds, project.app.wifi);
    if (project.screen) next.screen = project.screen;
    setProject(next);
  }

  function handleDeleteComponent(instanceId: string) {
    setProject(p => {
      const components = p.components.filter(c => c.instance_id !== instanceId);
      // Rebuild buses: drop bus if no component uses it anymore
      const needsI2c = components.some(c => c.bus_id === 'i2c0');
      const needsSpi = components.some(c => c.bus_id === 'spi0');
      const buses = {
        ...(needsI2c && p.buses.i2c0 ? { i2c0: p.buses.i2c0 } : {}),
        ...(needsSpi && p.buses.spi0 ? { spi0: p.buses.spi0 } : {}),
      };
      // Drop screen if it was bound to the deleted component or a now-removed sensor
      let screen = p.screen;
      if (screen) {
        if (screen.instance_id === instanceId) {
          screen = undefined;
        } else {
          const remainingIds = new Set(components.map(c => c.instance_id));
          const widgets = screen.widgets.filter(w => remainingIds.has(w.binding.split('.')[0]));
          screen = { ...screen, widgets };
        }
      }
      return { ...p, components, buses, screen };
    });
  }

  function handlePinChange(instanceId: string, pinName: string, gpio: number) {
    setProject(p => ({
      ...p,
      components: p.components.map(c =>
        c.instance_id === instanceId
          ? { ...c, pin_mapping: { ...c.pin_mapping, [pinName]: gpio } }
          : c
      ),
    }));
  }

  function handleScreenChange(screen: ProjectState['screen']) {
    setProject(p => ({ ...p, screen }));
  }

  const hasDisplay = project.components.some(
    c => c.catalog_id === 'ssd1306' || c.catalog_id === 'ili9341'
  );

  return (
    <div className="app-layout">
      <Sidebar onAdd={handleAdd} onLoadExample={handleLoadExample} onExport={handleExport} />
      <main className="canvas-area">
        {project.components.length === 0 ? (
          <div className="empty-state">
            <p>Add components from the sidebar or load an example to get started.</p>
          </div>
        ) : (
          <Canvas project={project} onDeleteComponent={handleDeleteComponent} onPinChange={handlePinChange} />
        )}
      </main>
      <div className="right-column">
        <RightPanel
          project={project}
          validation={validation}
          onWifiToggle={handleWifiToggle}
          onAutoFix={handleAutoFix}
        />
        {hasDisplay && (
          <DisplayPanel project={project} onChange={handleScreenChange} />
        )}
      </div>
    </div>
  );
}
