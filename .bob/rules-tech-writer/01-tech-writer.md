# Tech Writer — Mode Rules

These rules extend the common rules for the `tech-writer` mode.
They encode docs/PROJECT_PINPILOT.md §14.6 (LaTeX pitfalls) exactly.

---

## LaTeX Generation Rules (§14.6)

### Character escaping — mandatory
All text derived from project data (instance IDs, catalog IDs, pin names, measurement names,
notes) must have these characters escaped before being written into any `.tex` file:

| Raw | Escaped |
|-----|---------|
| `_` | `\_`   |
| `&` | `\&`   |
| `%` | `\%`   |
| `#` | `\#`   |
| `$` | `\$`   |
| `{` | `\{`   |
| `}` | `\}`   |
| `^` | `\^{}` |
| `~` | `\~{}` |
| `\` | `\textbackslash{}` |

Always use a Python helper function (e.g. `latex_escape(s)`) that applies these substitutions
in the correct order (`\` first, then the rest). Never paste raw project data into LaTeX output.

### Compiler
- Use `pdflatex` only.
- Do **not** use: `fontspec`, `minted`, XeLaTeX, LuaLaTeX, `--shell-escape`.
- No `\write18` or any shell-escape mechanism.

### Allowed packages
Only these packages are permitted without asking the user first:
`geometry`, `graphicx`, `booktabs`, `longtable`, `tikz`, `listings`, `xcolor`,
`hyperref`, `caption`.
Ask the user before adding any other package.

### Compilation procedure
1. Run `pdflatex -output-directory build docs/<file>.tex` once (generates `.aux`).
2. Run `pdflatex -output-directory build docs/<file>.tex` a second time (resolves references).
3. Run `copy build\<file>.pdf docs\` to place the final PDF in `docs/`.
4. Do **not** commit the `build/` directory — it is gitignored.

### Build directory
- Ensure `build/` exists before running pdflatex: `New-Item -ItemType Directory -Force build`
- Auxiliary files (`.aux`, `.log`, `.out`, `.toc`, `.synctex.gz`) stay in `build/`.
- Only the PDF is copied to `docs/`.

---

## Document Structure

The generated `.tex` file must include these sections in order:
1. Title page (project name, board, generation date).
2. Component list (table: instance ID, catalog name, interface, GPIO assignment summary).
3. Wiring table (component | pin name | ESP32 GPIO | notes) — use `longtable` for long tables.
4. Bus configuration (I2C pins + frequency; SPI pins + frequency; UART if present; 1-Wire pin).
5. Per-component notes (from the catalog entry's `notes` field — escaped).
6. Screen widget table (only if `screen` block is present in project.json):
   widget ID, type, data binding, position, size.

---

## Data Source Rules

- Read `project.json` and every referenced catalog entry for the project being documented.
- Read `catalog/esp32_devkit_pins.json` for the GPIO capability notes.
- Never invent pin descriptions — always source from the catalog or the pin table.
- The `pin_mapping` in project.json is keyed by component pin name (e.g. `"CS"`, `"SDA"`).
  Use those pin names in the wiring table, not the role strings.
