---
name: lvgl-screen
description: Use when generating display or screen code from a project.json screen block, or when creating LVGL or U8g2 GUI code for an ESP32 display.
---

# LVGL / U8g2 Screen Code Generator

Follow these steps to turn the `screen` block of `project.json` into a display driver
(`src/components/display.h` and `src/components/display.cpp`).

## Step 1 — Read inputs

1. Read the `screen` block from `project.json` (fields: `instance_id`, `driver`, `widgets`).
2. Find the display component in `components` by matching `instance_id`.
3. Read the display's catalog entry: `catalog/components/<catalog_id>.json`.
4. Read the display's `pin_mapping` from the component instance (keys are pin names).

## Step 2 — Branch on driver

### Branch A: `ssd1306` (OLED — U8g2 path)

**Do not use LVGL for OLED.** Use U8g2 only.

Library: `olikraus/U8g2` (from catalog entry).

Constructor to use:
```cpp
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
```
Note in a comment: if the module is a 1.3-inch OLED, the controller may be SH1106, not SSD1306.
In that case replace the constructor with `U8G2_SH1106_128X64_NONAME_F_HW_I2C`.

`begin()`:
- Call `u8g2.begin()`. Return false and log to Serial if it fails.

`update(sensor_data)`:
- Call only when at least one sensor value has changed (use a dirty flag).
- `u8g2.clearBuffer()`
- For each widget in `screen.widgets`:
  - `label` / `value`: use `u8g2.setFont(u8g2_font_ncenB08_tr)`, `u8g2.drawStr(x, y, text)`.
  - `bar`: use `u8g2.drawBox()` scaled to the widget width/height range.
- `u8g2.sendBuffer()`

### Branch B: `ili9341` or `st7789` (TFT — LVGL v9 path)

**LVGL version: v9 only.** The following v8 symbols must NEVER appear in generated code:
- `lv_disp_drv_t` → use `lv_display_t *`
- `lv_disp_draw_buf_t` → use `lv_display_set_buffers()`
- `lv_disp_drv_init()` → removed in v9
- `lv_disp_drv_register()` → use `lv_display_create()`
- `lv_disp_buf_init()` → removed in v9

**Buffer size:** partial buffer only.
```cpp
static lv_color_t lvgl_buf[LV_HOR_RES * 24];  // ~15 KB — do NOT use LV_HOR_RES * LV_VER_RES
```

**`begin()` sequence (LVGL v9):**
```cpp
lv_init();
lv_tick_set_cb(millis);                        // provide tick source
tft.begin();                                    // TFT_eSPI init
tft.setRotation(1);

lv_display_t *disp = lv_display_create(LV_HOR_RES, LV_VER_RES);
lv_display_set_flush_cb(disp, tft_flush_cb);
lv_display_set_buffers(disp, lvgl_buf, NULL, sizeof(lvgl_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
```

**TFT flush callback:**
```cpp
static void tft_flush_cb(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
    uint32_t w = area->x2 - area->x1 + 1;
    uint32_t h = area->y2 - area->y1 + 1;
    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.pushPixels((uint16_t *)px_map, w * h);
    tft.endWrite();
    lv_display_flush_ready(disp);
}
```

**Widget creation (one per entry in `screen.widgets`):**

Map widget `type` to LVGL v9 object:
- `label` / `value` → `lv_label_create(lv_screen_active())`, `lv_label_set_text()`
- `bar`  → `lv_bar_create()`, `lv_bar_set_range()`, `lv_bar_set_value()`
- `arc`  → `lv_arc_create()`, `lv_arc_set_range()`, `lv_arc_set_value()`
- `chart` → `lv_chart_create()`, `lv_chart_set_range()`, `lv_chart_series_add()`

Position with `lv_obj_set_pos(obj, widget.x, widget.y)`.
Size with `lv_obj_set_size(obj, widget.width, widget.height)` (where provided).

**`update(sensor_data)` — dirty flag pattern:**
```cpp
// Only update when value changed
if (new_value != last_value) {
    last_value = new_value;
    lv_label_set_text_fmt(label_obj, "%d %s", new_value, unit);
}
```

**In `loop()` (generated in main.cpp, not here):**
```cpp
static uint32_t last_lvgl = 0;
if (millis() - last_lvgl >= 5) {
    last_lvgl = millis();
    lv_timer_handler();
}
```

## Step 3 — TFT_eSPI build flags (TFT path only)

Do not write TFT_eSPI configuration into source files. Instead, emit these `build_flags`
for `platformio.ini` (pin values from the display's `pin_mapping`):

```
-D USER_SETUP_LOADED
-D ILI9341_DRIVER
-D TFT_MOSI=<pin_mapping["MOSI"]>
-D TFT_SCLK=<pin_mapping["SCK"]>
-D TFT_CS=<pin_mapping["CS"]>
-D TFT_DC=<pin_mapping["DC"]>
-D TFT_RST=<pin_mapping["RESET"]>
-D SPI_FREQUENCY=40000000
-D LV_CONF_INCLUDE_SIMPLE
-I include
```

Also generate `include/lv_conf.h` with only the features needed:
- Enable the widget types used in `screen.widgets`.
- Enable `LV_FONT_MONTSERRAT_12` (minimum readable size).
- Set `LV_COLOR_DEPTH 16`.
- Disable everything else to minimize RAM usage.

## Step 4 — Output

Produce:
- `src/components/display.h` — class declaration with `begin()`, `update(struct SensorData)`.
- `src/components/display.cpp` — full implementation following the branch above.
- If TFT path: also list the `build_flags` entries and `include/lv_conf.h` content
  (written by firmware-dev into the appropriate files).
