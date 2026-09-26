# Phase 3 — Web App Plan

## Overview

Build a minimal, demo-focused browser configurator for PinPilot. The app is a static single-page
application bootstrapped with Vite + React + TypeScript, deployed to GitHub Pages at
`/Hackathon-IBM/`. It has **no backend** — all data comes from the `catalog/` JSON files imported
at Vite build time. The only extra npm dependency is `@xyflow/react` (React Flow v12+).
Styling uses plain CSS (no Tailwind, no UI framework).

**Budget constraint:** This phase must stay under 7 Bobcoins. Sub-tasks 1–7 are implemented in
one pass. Verification is limited to one `npm install` + `npm run build` run with at most 3
fix attempts. No per-file read-back verification.

**What this phase produces:**
- `web/` — the full React app
- `.github/workflows/deploy.yml` — GitHub Actions workflow for GitHub Pages

---

## Architecture

```
web/
├── public/
├── src/
│   ├── data/             # Static JSON loaded at build time
│   │   ├── components.ts # Re-exports all catalog component JSON files
│   │   └── pins.ts       # Re-exports catalog/esp32_devkit_pins.json
│   ├── lib/
│   │   ├── autoAssign.ts # Pin auto-assignment algorithm (§8 rules)
│   │   └── validator.ts  # Validation rules (mirrors validate_project.py)
│   ├── components/       # React UI components
│   │   ├── Sidebar.tsx
│   │   ├── Canvas.tsx
│   │   ├── RightPanel.tsx
│   │   └── DisplayPanel.tsx
│   ├── nodes/            # React Flow custom nodes
│   │   ├── Esp32Node.tsx
│   │   └── ComponentNode.tsx
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

The app state is held in a single top-level `useState` in `App.tsx`:
- `components[]` — list of added component instances (catalog_id, instance_id, assigned pins)
- `wifi` — boolean toggle
- `displayConfig` — which sensor values to show on the screen

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold

**Status:** [ ] pending

**Intent:** Create the Vite + React + TypeScript project in `web/`, configure `vite.config.ts`
with the GitHub Pages base path, and install `@xyflow/react`.

**Expected Outcomes:**
- `web/` directory exists with a working Vite dev server (`npm run dev` from `web/`).
- `vite.config.ts` has `base: '/Hackathon-IBM/'`.
- `package.json` lists `@xyflow/react` as a dependency.
- TypeScript strict mode enabled, no compile errors on the empty scaffold.

**Todo List:**
1. Run `npm create vite@latest web -- --template react-ts` from the repo root.
2. `cd web && npm install && npm install @xyflow/react`.
3. Edit `vite.config.ts`: add `base: '/Hackathon-IBM/'`.
4. Remove the boilerplate `App.tsx` and `App.css` content, replacing with a blank shell.
5. Confirm `npm run build` succeeds with zero errors.

**Relevant Context:**
- AGENTS.md §9: "Only add packages beyond React + React Flow + Vite after asking the user."
- Vite base path must match the GitHub Pages repo sub-path exactly.

---

### Sub-Task 2 — Data Layer

**Status:** [ ] pending

**Intent:** Import the catalog JSON files and ESP32 pin table into the app as typed TypeScript
constants, so the rest of the app never makes network requests and the data is always in sync
with the catalog source of truth.

**Expected Outcomes:**
- `src/data/components.ts` exports `CATALOG: ComponentDef[]` — all 7 components.
- `src/data/pins.ts` exports `ESP32_PINS: Record<number, PinDef>` — all pin entries.
- TypeScript interfaces `ComponentDef`, `PinDef`, `ComponentPin` defined in `src/types.ts`.
- The interfaces match the actual JSON shape described in the exploration (see §3 and §2 of the
  sub-agent findings above).

**Todo List:**
1. Create `src/types.ts` with interfaces: `ComponentDef`, `ComponentPin`, `PinDef`,
   `ComponentInstance`, `BusConfig`, `ProjectState`.
2. Create `src/data/components.ts`: use Vite's `import.meta.glob` (or individual named imports)
   to import all `../../catalog/components/*.json` files, assemble into `CATALOG` array.
3. Create `src/data/pins.ts`: import `../../catalog/esp32_devkit_pins.json` and re-export
   as `ESP32_PINS`.
4. Verify TypeScript accepts the imports with no type errors.

**Relevant Context:**
- Vite supports `import` of JSON files natively — no plugin needed.
- Component JSON shape: `id`, `name`, `interface`, `pins[]` (each has `name` and `role`),
  `libraries[]`, `measurements[]`, `min_read_interval_ms`, `i2c_addresses?`.
- Pin JSON keys are string GPIO numbers; value is an object with `input`, `output`, `adc1`,
  `adc2`, `flags[]`, `notes`.

---

### Sub-Task 3 — Auto-Assignment Logic

**Status:** [ ] pending

**Intent:** Implement the pin auto-assignment function that, given a list of component instances
and a wifi flag, returns a fully assigned `pin_mapping` for each component (and bus configs),
following the §8 rules from `docs/PROJECT_PINPILOT.md`.

**Expected Outcomes:**
- `src/lib/autoAssign.ts` exports `autoAssign(instances, wifi): AssignedProject`.
- I2C components always get SDA=21, SCL=22.
- SPI components get MOSI=23, MISO=19, SCK=18; CS/DC/RESET get the first available free
  output GPIO from a priority list: [27, 26, 25, 17, 16, 15, 14, 13, 5, 4, 2, 0].
- OneWire and GPIO components pick the first free output GPIO from the same list.
- ADC components: when wifi=false use first free ADC1 or ADC2 pin; when wifi=true use ADC1
  only (GPIO32–36, 39).
- A "used pins" set is maintained across all assigned components to prevent collisions.
- The function is pure (no side effects) and deterministic.

**Todo List:**
1. Define the priority lists for free-GPIO assignment (ordered, safe pins first).
2. Implement the bus-first assignment: if interface is "i2c" → fixed SDA/SCL; if "spi" →
   fixed MOSI/MISO/SCK, then assign CS/DC/RESET from free list.
3. Implement ADC assignment respecting the wifi flag.
4. Implement generic GPIO/OneWire assignment from the free list.
5. Build the output structure: `buses`, `components[].pin_mapping`, `components[].bus_id`.
6. Write a small unit-style test (inline assertions or a test file) confirming:
   - Two I2C devices share the bus without collision.
   - An ADC sensor gets ADC1 pin when wifi=true.
   - A second SPI CS pin does not conflict with the first.

**Relevant Context:**
- Free GPIO priority list should avoid: GPIO1 (UART0 TX), GPIO3 (UART0 RX), GPIO6–11 (flash),
  GPIO34–39 (input-only), strapping pins (0, 2, 5, 12, 15) deprioritized but usable.
- `esp32_devkit_pins.json` has `output: false` for GPIO34–39 and `flags: ["flash"]` for
  GPIO6–11 — use these fields rather than hardcoding.

---

### Sub-Task 4 — Validator

**Status:** [ ] pending

**Intent:** Implement the same 5 error rules and 3 warning rules as `scripts/validate_project.py`
in TypeScript, so the right panel shows live feedback as the user builds their project.

**Expected Outcomes:**
- `src/lib/validator.ts` exports `validate(project): ValidationResult`.
- `ValidationResult` contains `errors: Issue[]` and `warnings: Issue[]`, each with a
  `code`, `message`, and optionally `suggestion`.
- All 5 errors from the Python script are reproduced:
  - E1: Flash GPIO (6–11)
  - E2: Output on input-only GPIO (34–39)
  - E3: I2C address collision
  - E4: Duplicate GPIO assignment
  - E5: ADC2 + WiFi conflict
- All 3 warnings reproduced:
  - W1: Strapping pin in use
  - W2: UART0 pin conflict with serial logging
  - W3: 5V logic component

**Todo List:**
1. Define the `Issue` and `ValidationResult` types in `src/types.ts`.
2. Implement each rule as a separate private function inside `validator.ts`.
3. Ensure the validator reads from `ESP32_PINS` for pin flags (no hardcoded lists).
4. Export a single `validate(project: ProjectState)` entry point.
5. Verify against the 3 invalid example projects in `examples/smart_farm_node/`:
   - `project_invalid.json` — should produce at least one error.
   - `project_invalid_adc2_wifi.json` — should produce E5 (ADC2 + WiFi).
   - `project_invalid_gpio_conflict.json` — should produce E4 (duplicate GPIO).

**Relevant Context:**
- `examples/smart_farm_node/project_invalid.json`
- `examples/smart_farm_node/project_invalid_adc2_wifi.json`
- `examples/smart_farm_node/project_invalid_gpio_conflict.json`
- `scripts/validate_project.py` — authoritative rule source (lines 169–315).

---

### Sub-Task 5 — Canvas and Nodes

**Status:** [ ] pending

**Intent:** Build the React Flow canvas with a fixed ESP32 DevKit node and draggable component
nodes. Edges represent wires (component pin → ESP32 GPIO).

**Expected Outcomes:**
- `src/nodes/Esp32Node.tsx` renders a styled card showing the ESP32 DevKit with its assigned
  GPIO numbers for each bus/role visible.
- `src/nodes/ComponentNode.tsx` renders a styled card showing the component name and its
  pin-to-GPIO mapping.
- `src/components/Canvas.tsx` renders a `<ReactFlow>` with:
  - One fixed ESP32 node (not draggable, top-center of canvas).
  - One `ComponentNode` per added component instance.
  - Labeled edges from each component GPIO handle to the matching ESP32 GPIO.
- The canvas auto-layouts component nodes below the ESP32 node (simple row layout is fine;
  no force-graph layout library).

**Todo List:**
1. Install no new dependencies — React Flow handles edges and handles natively.
2. Create `Esp32Node.tsx` with a `<Handle>` for every used GPIO pin.
3. Create `ComponentNode.tsx` with a `<Handle>` for every mapped pin.
4. Create `Canvas.tsx`: build `nodes[]` and `edges[]` arrays from `ProjectState`,
   pass to `<ReactFlow>`.
5. Connect `Canvas.tsx` to `App.tsx` state.
6. Verify the canvas renders both demo projects without React Flow warnings.

**Relevant Context:**
- React Flow docs: nodes need `id`, `position`, `type`, `data`.
- Edges need `id`, `source`, `target`, `sourceHandle`, `targetHandle`, `label`.
- @xyflow/react v12 API (not legacy `reactflow` v11).
- Keep node styling minimal — name, interface badge, pin list — in plain CSS.

---

### Sub-Task 6 — Sidebar and Right Panel

**Status:** [ ] pending

**Intent:** Build the left sidebar (catalog browser + add button) and the right panel
(validation results, WiFi toggle, wiring table, display widget checklist).

**Expected Outcomes:**
- `src/components/Sidebar.tsx`:
  - Lists all 7 catalog components, each with name, interface badge, and an "Add" button.
  - Clicking "Add" calls `addComponent(catalogId)` on App state, which runs `autoAssign`.
  - "Load example" dropdown with 3 options: "Weather Station", "Smart Farm Node",
    "Invalid example (ADC2 + WiFi)".
  - "Export project.json" button downloads the current `ProjectState` as a JSON file.
- `src/components/RightPanel.tsx`:
  - WiFi toggle (checkbox or toggle switch) — updates `app.wifi` and re-runs auto-assign
    and validator.
  - Validation section: shows errors (red) and warnings (yellow) with their message and
    suggestion. Shows "✓ No issues" when the list is empty.
  - Wiring table: two-column table — "Component pin" (e.g. `bme280_1 / SDA`) and
    "ESP32 GPIO" (e.g. `GPIO 21`).
- `src/components/DisplayPanel.tsx`:
  - Only rendered when at least one display component (ssd1306 or ili9341) is in the project.
  - Shows a checklist of available sensor measurements (from component `measurements[]`).
  - User checks which values to show on the display.
  - The selection is reflected in the `screen.widgets` array of the exported `ProjectState`.

**Todo List:**
1. Implement `Sidebar.tsx` with catalog list and add/load/export actions.
2. Implement export: `JSON.stringify(projectState, null, 2)` → `Blob` → `<a download>` click.
3. Implement "Load example" by importing the 3 example JSON files via static import.
4. Implement `RightPanel.tsx` with WiFi toggle, validation display, and wiring table.
5. Implement `DisplayPanel.tsx` with sensor checklist and screen config output.
6. Wire all panels together in `App.tsx`.

**Relevant Context:**
- Example files to import: `../../examples/weather_station/project.json`,
  `../../examples/smart_farm_node/project.json`,
  `../../examples/smart_farm_node/project_invalid_adc2_wifi.json`.
- Display components: catalog_id is `ssd1306` or `ili9341` — check `interface === "i2c"` +
  `id.includes("ssd1306")` or check a new catalog field `"category": "display"`.
- Widget types from schema: `label`, `value`, `bar`, `arc`, `chart`.
- For Phase 3 scope: pre-assign default widget type `"value"` for each checked measurement,
  using a simple stacked layout (increment y by 16px per widget for SSD1306).

---

### Sub-Task 7 — GitHub Actions Deployment

**Status:** [ ] pending

**Intent:** Add a GitHub Actions workflow that builds the Vite app and deploys it to GitHub Pages
on every push to `main`.

**Expected Outcomes:**
- `.github/workflows/deploy.yml` exists and is valid YAML.
- Workflow triggers on `push` to `main`.
- Build step: `cd web && npm ci && npm run build`.
- Deploy step: uses `actions/deploy-pages` (or `peaceiris/actions-gh-pages`) to push
  `web/dist/` to the `gh-pages` branch.
- After merge to main, the app is live at `https://<user>.github.io/Hackathon-IBM/`.

**Todo List:**
1. Create `.github/workflows/deploy.yml`.
2. Use Node 20, cache npm dependencies.
3. Build with `npm run build` from `web/`.
4. Deploy `web/dist` to GitHub Pages using the standard pages action.
5. Verify the YAML is syntactically valid (no tabs, correct indentation).

**Relevant Context:**
- Vite base path in `vite.config.ts` must be `/Hackathon-IBM/` (already set in Sub-Task 1).
- GitHub repo owner: `elianpablo`, repo name: `Hackathon-IBM` (infer from workspace path).
- GitHub Pages must be set to deploy from the `gh-pages` branch in repo settings
  (user action, not automatable here).

---

## Non-Goals (explicitly out of scope for this phase)

- Free-form screen widget designer (only the predefined checklist from Sub-Task 6).
- Multiple I2C buses or SPI buses (one of each is sufficient for demos).
- UART component assignment in the auto-assign (UART2 pins reserved but no UART component
  in the current catalog).
- Drag-to-reorder nodes or custom node layout.
- Any backend, API call, or AI inference in the browser.
- Adding new catalog components (that is Phase 6).
- Mobile responsiveness.
- Parity check script (dropped to stay within budget).

---

## Confirmed Decisions

- **Invalid example to load:** `project_invalid_adc2_wifi.json` (ADC2 + WiFi conflict).
- **Display widget export:** include pixel positions from the predefined stacked layout
  (y += 16px per widget for SSD1306; y += 30px per widget for ILI9341).
- **Implementation approach:** all 7 sub-tasks in one pass; single `npm install` +
  `npm run build` verification run; max 3 build-fix attempts; short report appended to
  `docs/BOB_USAGE_LOG.md` at the end.
