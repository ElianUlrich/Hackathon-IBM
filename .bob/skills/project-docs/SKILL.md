---
name: project-docs
description: Use when generating LaTeX documentation, a wiring table, or a pin map for a PinPilot project.
---

# Project Documentation Generator

Follow these steps to produce a LaTeX wiring document and compile it to PDF.

## Step 1 — Read all inputs

1. Read the target `project.json`.
2. For every component in `components`, read `catalog/components/<catalog_id>.json`.
3. Read `catalog/esp32_devkit_pins.json` for GPIO capability notes.
4. Determine the output file names:
   - Script: `scripts/generate_docs.py` (create if absent)
   - LaTeX source: `docs/<demo_name>.tex`
   - PDF: `docs/<demo_name>.pdf`
   - Build intermediates: `build/` directory

## Step 2 — Generate or update `scripts/generate_docs.py`

If `scripts/generate_docs.py` does not exist, create it. If it exists, update it for the
current project. The script must:

### 2a. LaTeX escaping helper (mandatory)
```python
def latex_escape(s: str) -> str:
    """Escape all LaTeX special characters in string s."""
    s = str(s)
    s = s.replace("\\", "\\textbackslash{}")
    s = s.replace("&",  "\\&")
    s = s.replace("%",  "\\%")
    s = s.replace("$",  "\\$")
    s = s.replace("#",  "\\#")
    s = s.replace("_",  "\\_")
    s = s.replace("{",  "\\{")
    s = s.replace("}",  "\\}")
    s = s.replace("^",  "\\^{}")
    s = s.replace("~",  "\\~{}")
    return s
```
Apply `latex_escape()` to every string derived from project data before writing to `.tex`.

### 2b. Script usage
```
python scripts/generate_docs.py <project.json path> <output.tex path>
```
The script reads project.json and all catalog files, then writes the `.tex` file.

### 2c. Document sections to generate
The `.tex` file must contain these sections in order:

1. **Preamble** — `\documentclass{article}`, allowed packages only:
   `geometry`, `graphicx`, `booktabs`, `longtable`, `listings`, `xcolor`, `hyperref`, `caption`.
   Set `geometry` to A4 with 2.5cm margins.

2. **Title page** — project name (from the demo folder name), board (`ESP32 DevKit`),
   generation date (`\today`).

3. **Component list** — table with columns:
   Instance ID | Catalog name | Interface | GPIO summary
   Use `\begin{longtable}` with `\toprule`/`\midrule`/`\bottomrule` (booktabs style).

4. **Wiring table** — one row per pin assignment, columns:
   Instance ID | Component pin name | ESP32 GPIO | GPIO notes (from pin table)
   `pin_mapping` keys are pin names (e.g. `CS`, `SDA`) — use them directly.
   Source GPIO notes from `esp32_devkit_pins.json[str(gpio)]["notes"]`.

5. **Bus configuration** — one subsection per bus present in `buses`:
   - I2C: SDA GPIO, SCL GPIO, frequency.
   - SPI: MOSI, MISO, SCK GPIOs, frequency, CS pin per device.
   - UART2: RX, TX, baud rate.
   - 1-Wire: DQ GPIO (from component pin_mapping).

6. **Component notes** — one subsection per component, containing the `notes` field from
   its catalog entry (escaped). Skip components with empty notes.

7. **Screen widget table** (only if `screen` block is present) — columns:
   Widget ID | Type | Data binding | X | Y | Width | Height | Min | Max
   Omit size/range columns for `label` and `value` widgets.

## Step 3 — Run the script

```
python scripts/generate_docs.py examples/<demo>/project.json docs/<demo>.tex
```

If the script fails, fix the error and re-run. Report the error clearly.

## Step 4 — Compile LaTeX (twice)

Ensure the `build/` directory exists:
```
New-Item -ItemType Directory -Force build
```

First pass (generates `.aux` cross-reference file):
```
pdflatex -output-directory build docs/<demo>.tex
```

Second pass (resolves references):
```
pdflatex -output-directory build docs/<demo>.tex
```

Check the second-pass output for errors. Warnings about overfull `\hbox` or missing fonts
are acceptable; `LaTeX Error:` lines are not.

## Step 5 — Copy PDF to docs/

```
copy build\<demo>.pdf docs\
```

## Step 6 — Report

Tell the user:
- Path to the generated PDF: `docs/<demo>.pdf`
- Page count (found in pdflatex output: `Output written on ... (N pages)`)
- Any LaTeX errors or significant warnings from the second compile pass
- Any catalog fields that were empty or marked `"TODO: verify"` and therefore skipped
