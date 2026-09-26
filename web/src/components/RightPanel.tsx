import type { ProjectState, ValidationResult } from '../types';

interface RightPanelProps {
  project: ProjectState;
  validation: ValidationResult;
  onWifiToggle: (val: boolean) => void;
  onAutoFix: () => void;
}

export function RightPanel({ project, validation, onWifiToggle, onAutoFix }: RightPanelProps) {
  const { errors, warnings } = validation;

  // Build wiring table rows
  const rows: { compPin: string; gpio: number }[] = [];
  for (const comp of project.components) {
    for (const [pinName, gpio] of Object.entries(comp.pin_mapping)) {
      rows.push({ compPin: `${comp.instance_id} / ${pinName}`, gpio });
    }
  }
  rows.sort((a, b) => a.gpio - b.gpio);

  return (
    <aside className="right-panel">
      {/* WiFi toggle */}
      <div className="panel-section">
        <h3>App Settings</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={project.app.wifi}
            onChange={e => onWifiToggle(e.target.checked)}
          />
          <span>WiFi enabled</span>
        </label>
        {project.app.wifi && (
          <p className="hint">ADC2 pins (0,2,4,12–15,25–27) blocked while WiFi is active.</p>
        )}
      </div>

      {/* Validation */}
      <div className="panel-section">
        <h3>Validation</h3>
        {errors.length === 0 && warnings.length === 0 && (
          <p className="ok-msg">✓ No issues</p>
        )}
        {errors.length > 0 && (
          <button className="btn btn-autofix" onClick={onAutoFix}>
            ⚡ Auto-fix pins
          </button>
        )}
        {errors.map((e, i) => (
          <div key={i} className="issue issue-error">
            <span className="issue-code">{e.code}</span>
            <span className="issue-msg">{e.message}</span>
            {e.suggestion && <span className="issue-hint">{e.suggestion}</span>}
          </div>
        ))}
        {warnings.map((w, i) => (
          <div key={i} className="issue issue-warn">
            <span className="issue-code">{w.code}</span>
            <span className="issue-msg">{w.message}</span>
            {w.suggestion && <span className="issue-hint">{w.suggestion}</span>}
          </div>
        ))}
      </div>

      {/* Wiring table */}
      {rows.length > 0 && (
        <div className="panel-section">
          <h3>Wiring Table</h3>
          <table className="wiring-table">
            <thead>
              <tr>
                <th>Component Pin</th>
                <th>ESP32 GPIO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.compPin}</td>
                  <td>GPIO {r.gpio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
}
