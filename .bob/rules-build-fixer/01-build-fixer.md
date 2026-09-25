# Build Fixer — Mode Rules

These rules extend the common rules for the `build-fixer` mode.
This mode handles attempts 2 and 3 of the 3-attempt maximum build loop.
Attempt 1 was run by firmware-dev.

---

## Attempt Tracking

- You are called when firmware-dev's first build attempt failed.
- You have a maximum of **2 more attempts** (attempts 2 and 3). Track them explicitly.
- At the start of each response, state: "Build fix attempt N of 3."
- After attempt 3 fails: **stop immediately**, do not try again.

---

## Error-Reading Rules

- Run `python scripts/build.py examples/<demo>/firmware` to get the build output.
- Read **only the first error block** — the lines from the first `error:` up to the blank
  line or next file reference. Do not read or process the full `.pio/` build log.
- Do not open files in `.pio/libdeps/` or `.pio/build/`. Read only source files under
  `src/`, `include/`, and `platformio.ini`.
- One error at a time: fix the first error, rebuild, then address the next if needed.

---

## Fix Rules

- Apply the **minimal change** that resolves the error. Do not refactor, rename, or
  reorganize code beyond what the error demands.
- Never edit files inside `.pio/libdeps/` — fix the project source files, not the library.
- Never change a pinned library version in `platformio.ini` without reporting it to the user.
- If the error is an LVGL v8 API symbol (`lv_disp_drv_t`, `lv_disp_draw_buf_t`,
  `lv_disp_drv_init`, `lv_disp_drv_register`, `lv_disp_buf_init`): replace with the
  correct LVGL v9 equivalent. Do not downgrade to LVGL v8.
- If the error is a missing `#include`: add the correct include. Do not invent headers.
- If the error is a type mismatch or undefined symbol: fix the declaration in pinmap.h or
  the component file. Do not change the calling code in main.cpp unless necessary.

---

## Rebuild After Each Fix

After every fix, run: `python scripts/build.py examples/<demo>/firmware`

Report the result:
- **BUILD PASSED** — state RAM/flash usage from build output, declare success.
- **BUILD FAILED** — increment attempt counter. If attempt < 3, read the next error and fix.
  If attempt == 3, go to the Stop Protocol below.

---

## Stop Protocol (after attempt 3 fails)

Do not attempt a 4th fix. Instead, produce this summary and ask the user:

```
BUILD LOOP EXHAUSTED (3/3 attempts used)

Errors seen across attempts:
- Attempt 1 (firmware-dev): <first error>
- Attempt 2 (build-fixer):  <first error>
- Attempt 3 (build-fixer):  <first error>

Files changed:
- <list of files modified and what was changed>

Hypotheses for remaining failure:
- <hypothesis 1>
- <hypothesis 2>

Recommended next steps:
- <action 1>
- <action 2>

Please advise how to proceed.
```
