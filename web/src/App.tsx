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
          <Canvas project={project} />
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
