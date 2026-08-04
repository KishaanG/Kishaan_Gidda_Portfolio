/* ============================================================
   Kishaan's Village — canvas engine
   480 x 320 internal buffer, scaled up with pixelated rendering.
   Static world is pre-rendered once to an offscreen canvas;
   the frame loop draws only the animated layer on top.
   ============================================================ */

(() => {
  "use strict";

  const W = 480;
  const H = 320;
  const TILE = 16;
  const COLS = W / TILE;
  const ROWS = H / TILE;

  const C = VILLAGE.C;
  const S = VILLAGE.SPOTS;

  const canvas = document.getElementById("village");
  const ctx = canvas.getContext("2d");
  const bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  const bgx = bg.getContext("2d");

  let dispScale = 1;
  let hovered = null;
  let hintDismissed = false;

  /* ---------- deterministic hash (stable speckles, no flicker) ---------- */
  function hash(n) {
    let x = (n << 13) ^ n;
    return (((x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff);
  }
  const h2 = (a, b) => hash(a * 374761 + b * 668265);

  /* ---------- tiny draw helpers ---------- */
  function px(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawMicro(g, text, x, y, color, scale = 1) {
    g.fillStyle = color;
    let cx = x;
    for (const ch of text) {
      const glyph = VILLAGE.FONT[ch];
      if (!glyph) { cx += 4 * scale; continue; }
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (glyph[r][c] === "1") {
            g.fillRect(cx + c * scale, y + r * scale, scale, scale);
          }
        }
      }
      cx += 4 * scale;
    }
  }

  const microWidth = (text, scale = 1) => text.length * 4 * scale - scale;

  /* ============================================================
     STATIC WORLD
     ============================================================ */

  function inIsland(tx, ty) {
    if (tx < 1 || tx > COLS - 2 || ty < 1 || ty > ROWS - 2) return false;
    const cuts = [
      [1, 1], [2, 1], [1, 2],                       // top-left
      [COLS - 2, 1], [COLS - 3, 1], [COLS - 2, 2],  // top-right
      [1, ROWS - 2], [2, ROWS - 2], [1, ROWS - 3],  // bottom-left
      [COLS - 2, ROWS - 2], [COLS - 3, ROWS - 2], [COLS - 2, ROWS - 3],
    ];
    return !cuts.some(([cx, cy]) => cx === tx && cy === ty);
  }

  function paintGround() {
    px(bgx, 0, 0, W, H, C.sky);

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        if (!inIsland(tx, ty)) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        px(bgx, x, y, TILE, TILE, (tx + ty) % 2 ? C.grassAlt : C.grass);

        // stable grass speckles
        for (let i = 0; i < 3; i++) {
          const r = h2(tx * 31 + i, ty * 17 + i);
          if (r > 0.45) {
            px(bgx, x + Math.floor(h2(tx + i, ty) * 14), y + Math.floor(h2(ty + i, tx) * 14), 1, 2, C.grassDark);
          }
        }
        // occasional tiny flowers
        const f = h2(tx * 7, ty * 13);
        if (f > 0.93) {
          const fx = x + 3 + Math.floor(f * 9);
          const fy = y + 3 + Math.floor(h2(ty, tx) * 9);
          px(bgx, fx, fy, 1, 1, f > 0.97 ? C.white : C.gold);
        }

        // darker rim + floating-island cliff lip on the sky boundary
        if (!inIsland(tx, ty - 1)) px(bgx, x, y, TILE, 2, C.grassDark);
        if (!inIsland(tx - 1, ty)) px(bgx, x, y, 2, TILE, C.grassDark);
        if (!inIsland(tx + 1, ty)) px(bgx, x + TILE - 2, y, 2, TILE, C.grassDark);
        if (!inIsland(tx, ty + 1)) {
          px(bgx, x, y + TILE - 2, TILE, 2, C.grassDark);
          px(bgx, x, y + TILE, TILE, 4, C.woodDark);
          px(bgx, x, y + TILE + 4, TILE, 2, "#5E4128");
        }
      }
    }
  }

  function paintPaths() {
    for (const p of VILLAGE.PATHS) {
      px(bgx, p.x, p.y, p.w, p.h, C.path);
      px(bgx, p.x, p.y, p.w, 1, C.pathDark);
      px(bgx, p.x, p.y + p.h - 1, p.w, 1, C.pathDark);
      px(bgx, p.x, p.y, 1, p.h, C.pathDark);
      px(bgx, p.x + p.w - 1, p.y, 1, p.h, C.pathDark);
      // worn cobble specks
      const count = Math.floor((p.w * p.h) / 60);
      for (let i = 0; i < count; i++) {
        const rx = p.x + 2 + Math.floor(h2(p.x + i, p.y) * (p.w - 5));
        const ry = p.y + 2 + Math.floor(h2(p.y + i, p.x) * (p.h - 5));
        px(bgx, rx, ry, 2, 1, h2(i, p.x) > 0.5 ? C.pathDark : "#D2C492");
      }
    }

    const pl = VILLAGE.PLAZA;
    px(bgx, pl.x, pl.y, pl.w, pl.h, C.path);
    px(bgx, pl.x, pl.y, pl.w, 1, C.pathDark);
    px(bgx, pl.x, pl.y + pl.h - 1, pl.w, 1, C.pathDark);
    px(bgx, pl.x, pl.y, 1, pl.h, C.pathDark);
    px(bgx, pl.x + pl.w - 1, pl.y, 1, pl.h, C.pathDark);
    for (let i = 0; i < 26; i++) {
      const rx = pl.x + 2 + Math.floor(h2(i, 99) * (pl.w - 6));
      const ry = pl.y + 2 + Math.floor(h2(99, i) * (pl.h - 6));
      px(bgx, rx, ry, 2, 1, h2(i, 7) > 0.5 ? C.pathDark : "#D2C492");
    }
  }

  function paintField() {
    const f = S.field;
    // mow stripes
    for (let i = 0; i < f.h / 8; i++) {
      px(bgx, f.x, f.y + i * 8, f.w, 8, i % 2 ? C.pitchAlt : C.pitch);
    }
    // touchlines, halfway line, centre circle (faded white)
    const line = "rgba(245,245,247,0.8)";
    px(bgx, f.x + 2, f.y + 2, f.w - 4, 1, line);
    px(bgx, f.x + 2, f.y + f.h - 3, f.w - 4, 1, line);
    px(bgx, f.x + 2, f.y + 2, 1, f.h - 4, line);
    px(bgx, f.x + f.w - 3, f.y + 2, 1, f.h - 4, line);
    px(bgx, f.x + f.w / 2, f.y + 2, 1, f.h - 4, line);
    bgx.strokeStyle = line;
    bgx.beginPath();
    bgx.arc(f.x + f.w / 2, f.y + f.h / 2, 8, 0, Math.PI * 2);
    bgx.stroke();
    // goals
    for (const gx of [f.x - 3, f.x + f.w - 1]) {
      px(bgx, gx, f.y + f.h / 2 - 10, 4, 1, C.white);
      px(bgx, gx, f.y + f.h / 2 + 9, 4, 1, C.white);
      px(bgx, gx + (gx < f.x ? 0 : 3), f.y + f.h / 2 - 10, 1, 20, C.white);
    }
  }

  // soft shadow cast east (+x) of an object footprint
  function castShadow(x, y, w, h) {
    bgx.fillStyle = "rgba(20,20,42,0.16)";
    bgx.fillRect(x + w - 1, y + Math.floor(h * 0.35), Math.max(6, Math.floor(w * 0.3)), Math.ceil(h * 0.65));
  }

  function paintTreesAndBushes() {
    for (const t of VILLAGE.TREES) {
      bgx.fillStyle = "rgba(20,20,42,0.16)";
      bgx.beginPath();
      bgx.ellipse(t.x + 7, t.y, 7, 3, 0, 0, Math.PI * 2);
      bgx.fill();

      px(bgx, t.x - 1, t.y - 6, 3, 6, C.wood);
      px(bgx, t.x + 1, t.y - 6, 1, 6, C.woodDark);
      bgx.fillStyle = "#3E8F3D";
      bgx.beginPath();
      bgx.arc(t.x + 0.5, t.y - 11, 7.5, 0, Math.PI * 2);
      bgx.fill();
      bgx.fillStyle = "#6FCF6E";
      bgx.beginPath();
      bgx.arc(t.x - 2, t.y - 13.5, 4, 0, Math.PI * 2);
      bgx.fill();
    }
    for (const b of VILLAGE.BUSHES) {
      bgx.fillStyle = "#3E8F3D";
      bgx.beginPath();
      bgx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      bgx.fill();
      bgx.fillStyle = "#6FCF6E";
      bgx.beginPath();
      bgx.arc(b.x - 1.5, b.y - 1.5, 2, 0, Math.PI * 2);
      bgx.fill();
    }
  }

  function drawSign(x, y, text, accent) {
    const w = microWidth(text) + 6;
    px(bgx, x + Math.floor(w / 2) - 1, y + 9, 2, 6, C.woodDark); // post
    px(bgx, x, y, w, 11, C.ink);
    px(bgx, x, y, w, 1, C.white);
    px(bgx, x, y + 10, w, 1, C.white);
    px(bgx, x, y, 1, 11, C.white);
    px(bgx, x + w - 1, y, 1, 11, C.white);
    drawMicro(bgx, text, x + 3, y + 3, accent);
  }

  /* ---------- buildings (static parts) ---------- */

  function paintCiena() {
    const x = S.ciena.x, y = S.ciena.y; // 48 x 64 tower
    castShadow(x, y + 8, 48, 56);

    px(bgx, x, y, 48, 64, "#9FB2CC");
    px(bgx, x + 42, y, 6, 64, "#7E92AE");          // east shade
    px(bgx, x, y, 48, 2, "#C3D2E6");               // parapet highlight
    px(bgx, x - 1, y - 1, 50, 1, C.ink);           // outline
    px(bgx, x - 1, y, 1, 65, C.ink);
    px(bgx, x + 48, y, 1, 65, C.ink);

    // glowing blue windows, 3 x 4 grid
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = x + 7 + c * 13;
        const wy = y + 7 + r * 13;
        px(bgx, wx, wy, 7, 7, C.techBlue);
        px(bgx, wx, wy, 3, 3, "#8FD0FF");
        px(bgx, wx - 1, wy - 1, 9, 1, C.ink);
        px(bgx, wx - 1, wy + 7, 9, 1, C.ink);
        px(bgx, wx - 1, wy, 1, 7, C.ink);
        px(bgx, wx + 7, wy, 1, 7, C.ink);
      }
    }

    // door + awning
    px(bgx, x + 19, y + 52, 10, 12, "#2E3A52");
    px(bgx, x + 26, y + 57, 2, 2, C.gold);
    px(bgx, x + 17, y + 50, 14, 2, C.techBlue);

    // satellite dish on the roof
    bgx.fillStyle = "#C9D4E2";
    bgx.beginPath();
    bgx.ellipse(x + 36, y - 6, 6, 4, -0.5, 0, Math.PI * 2);
    bgx.fill();
    px(bgx, x + 35, y - 4, 2, 5, "#7E92AE");
    px(bgx, x + 38, y - 8, 1, 1, C.white);

    drawSign(x + 4, y + 68, "CIENA", C.techBlue);
  }

  function paintHydro() {
    const x = S.hydro.x, y = S.hydro.y; // 80 x 48 industrial block
    castShadow(x, y + 6, 80, 42);

    px(bgx, x, y, 80, 48, "#8E959E");
    px(bgx, x + 72, y, 8, 48, "#6E7682");
    px(bgx, x, y, 80, 3, "#5C636D");               // flat roof edge
    px(bgx, x - 1, y - 1, 82, 1, C.ink);
    px(bgx, x - 1, y, 1, 49, C.ink);
    px(bgx, x + 80, y, 1, 49, C.ink);

    // roof vents
    for (let i = 0; i < 3; i++) px(bgx, x + 12 + i * 22, y - 4, 8, 4, "#6E7682");

    // industrial windows
    for (let i = 0; i < 4; i++) {
      const wx = x + 8 + i * 18;
      px(bgx, wx, y + 10, 10, 8, "#D8E4EE");
      px(bgx, wx, y + 14, 10, 1, "#9FB2CC");
      px(bgx, wx - 1, y + 9, 12, 1, C.ink);
      px(bgx, wx - 1, y + 18, 12, 1, C.ink);
      px(bgx, wx - 1, y + 10, 1, 8, C.ink);
      px(bgx, wx + 10, y + 10, 1, 8, C.ink);
    }

    // sliding door — centred over the approach path so the doorway lines up
    // with where the player steps in to press space
    px(bgx, x + 32, y + 26, 16, 22, "#5C636D");
    px(bgx, x + 32, y + 26, 16, 2, "#454B54");
    for (let i = 0; i < 4; i++) px(bgx, x + 34 + i * 4, y + 30, 1, 16, "#454B54");

    // hazard stripes along the base
    for (let i = 0; i < 10; i++) {
      px(bgx, x + i * 8, y + 42, 4, 6, C.gold);
      px(bgx, x + i * 8 + 4, y + 42, 4, 6, C.ink);
    }

    // water trough feeding the wheel (wheel itself is animated)
    px(bgx, x - 18, y + 42, 22, 6, "#3E8FD0");
    px(bgx, x - 18, y + 42, 22, 1, "#8FD0FF");
    px(bgx, x - 19, y + 41, 24, 1, C.ink);

    drawSign(x + 28, y + 52, "HYDRO", C.gold);
  }

  function paintTrendAI() {
    const x = S.trendai.x, y = S.trendai.y; // 56 x 48 glass cube
    castShadow(x, y + 6, 56, 42);

    // glass panels
    for (let i = 0; i < 7; i++) {
      px(bgx, x + i * 8, y, 8, 48, i % 2 ? "#7D74C9" : "#9F95E8");
    }
    // diagonal reflections
    for (let i = 0; i < 5; i++) {
      px(bgx, x + 6 + i * 10, y + 4 + i * 7, 2, 9, "rgba(245,245,247,0.55)");
    }
    // mullions + frame
    for (let i = 1; i < 7; i++) px(bgx, x + i * 8, y, 1, 48, "#4A4566");
    px(bgx, x, y + 16, 56, 1, "#4A4566");
    px(bgx, x, y + 32, 56, 1, "#4A4566");
    px(bgx, x - 1, y - 1, 58, 1, C.ink);
    px(bgx, x - 1, y, 1, 49, C.ink);
    px(bgx, x + 56, y, 1, 49, C.ink);

    // purple glow trims
    px(bgx, x, y, 56, 2, C.purple);
    px(bgx, x, y + 46, 56, 2, C.purple);

    // glass entrance on the front (south) side, lined up with the doorway the
    // player steps into from the front to press space
    px(bgx, x + 18, y + 32, 12, 16, "#C9C2F2");
    px(bgx, x + 24, y + 32, 1, 16, "#4A4566"); // mullion
    px(bgx, x + 17, y + 31, 14, 1, C.ink);     // lintel

    // antenna mast (lamp on top is animated)
    px(bgx, x + 27, y - 14, 2, 14, "#4A4566");
    px(bgx, x + 24, y - 6, 8, 1, "#4A4566");

    drawSign(x + 9, y + 52, "TRENDAI", C.purple);
  }

  function paintWorkshop() {
    const x = S.workshop.x, y = S.workshop.y; // 56 x 40 cottage
    castShadow(x, y + 6, 56, 34);

    // walls
    px(bgx, x, y + 10, 56, 30, C.wood);
    px(bgx, x + 50, y + 10, 6, 30, C.woodDark);
    px(bgx, x - 1, y + 10, 1, 30, C.ink);
    px(bgx, x + 56, y + 10, 1, 30, C.ink);
    // plank lines
    for (let i = 1; i < 4; i++) px(bgx, x, y + 10 + i * 7, 56, 1, "rgba(122,84,57,0.6)");

    // stepped pitched roof
    px(bgx, x - 4, y + 8, 64, 4, "#6B4A32");
    px(bgx, x + 2, y + 4, 52, 4, "#7A5439");
    px(bgx, x + 8, y, 40, 4, "#8A6244");
    px(bgx, x + 14, y - 4, 28, 4, "#9A7050");
    px(bgx, x - 5, y + 7, 66, 1, C.ink);

    // chimney (smoke is animated)
    px(bgx, x + 42, y - 10, 7, 10, "#8E959E");
    px(bgx, x + 41, y - 11, 9, 2, "#6E7682");

    // warm windows
    for (const wx of [x + 8, x + 38]) {
      px(bgx, wx, y + 18, 9, 8, "#FFC964");
      px(bgx, wx + 4, y + 18, 1, 8, C.woodDark);
      px(bgx, wx, y + 21, 9, 1, C.woodDark);
      px(bgx, wx - 1, y + 17, 11, 1, C.ink);
      px(bgx, wx - 1, y + 26, 11, 1, C.ink);
      px(bgx, wx - 1, y + 18, 1, 8, C.ink);
      px(bgx, wx + 9, y + 18, 1, 8, C.ink);
    }

    // front door between the windows, at the doorway the player steps into from
    // the front (south) to press space
    px(bgx, x + 20, y + 12, 16, 28, "#5E4128");
    px(bgx, x + 20, y + 12, 16, 1, "#3E2C1A"); // lintel
    px(bgx, x + 31, y + 26, 2, 2, C.gold);      // knob

    // clutter: gear + barrel + leaning tools
    bgx.fillStyle = "#6E7682";
    bgx.beginPath();
    bgx.arc(x - 9, y + 33, 5, 0, Math.PI * 2);
    bgx.fill();
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      px(bgx, x - 9 + Math.cos(ang) * 6 - 1, y + 33 + Math.sin(ang) * 6 - 1, 2, 2, "#6E7682");
    }
    bgx.fillStyle = "#454B54";
    bgx.beginPath();
    bgx.arc(x - 9, y + 33, 2, 0, Math.PI * 2);
    bgx.fill();
    px(bgx, x + 60, y + 28, 8, 12, C.wood);
    px(bgx, x + 60, y + 31, 8, 1, C.woodDark);
    px(bgx, x + 60, y + 36, 8, 1, C.woodDark);
    px(bgx, x + 70, y + 26, 2, 14, "#8E959E"); // leaning wrench/rod

    // chalkboard sign
    const sx = x + 6, sy = y + 44;
    px(bgx, sx + 2, sy + 12, 2, 5, C.woodDark);
    px(bgx, sx + 18, sy + 12, 2, 5, C.woodDark);
    px(bgx, sx, sy, 22, 13, "#2E3A35");
    px(bgx, sx, sy, 22, 1, C.wood);
    px(bgx, sx, sy + 12, 22, 1, C.wood);
    px(bgx, sx, sy, 1, 13, C.wood);
    px(bgx, sx + 21, sy, 1, 13, C.wood);
    drawMicro(bgx, "MISC", sx + 4, sy + 4, C.white);
  }

  function paintTower() {
    const x = 168, top = 200, base = 272; // lattice mast centre x
    castShadow(x - 10, top + 30, 20, base - top - 20);

    // concrete pad
    px(bgx, x - 14, base - 2, 28, 8, "#8E959E");
    px(bgx, x - 14, base - 2, 28, 1, "#C9D4E2");

    // converging rails with cross braces
    bgx.strokeStyle = "#3E4650";
    bgx.lineWidth = 1;
    const seg = 6;
    for (let i = 0; i <= seg; i++) {
      const t0 = i / seg;
      const y0 = top + t0 * (base - top);
      const half0 = 4 + t0 * 8;
      if (i < seg) {
        const t1 = (i + 1) / seg;
        const y1 = top + t1 * (base - top);
        const half1 = 4 + t1 * 8;
        bgx.beginPath();
        bgx.moveTo(x - half0, y0); bgx.lineTo(x + half1, y1);
        bgx.moveTo(x + half0, y0); bgx.lineTo(x - half1, y1);
        bgx.stroke();
      }
      px(bgx, x - half0 - 1, y0, 2, 2, "#5A6470");
      px(bgx, x + half0 - 1, y0, 2, 2, "#5A6470");
    }
    // rails
    bgx.beginPath();
    bgx.moveTo(x - 4, top); bgx.lineTo(x - 12, base);
    bgx.moveTo(x + 4, top); bgx.lineTo(x + 12, base);
    bgx.stroke();

    // spike + dish stub
    px(bgx, x - 1, top - 12, 2, 12, "#3E4650");
    px(bgx, x + 1, top - 6, 5, 2, "#5A6470");

    // mailbox at the base
    px(bgx, 190, 262, 2, 9, C.woodDark);
    px(bgx, 186, 256, 11, 7, "#D9534F");
    px(bgx, 186, 256, 11, 2, "#A93A37");
    px(bgx, 187, 259, 6, 1, C.ink);
    px(bgx, 197, 254, 1, 4, C.gold); // little flag
  }

  function paintFountainBase() {
    const { cx, cy } = VILLAGE.FOUNTAIN;
    bgx.fillStyle = C.stoneDark;
    bgx.beginPath();
    bgx.arc(cx, cy, 15, 0, Math.PI * 2);
    bgx.fill();
    bgx.fillStyle = C.stone;
    bgx.beginPath();
    bgx.arc(cx, cy, 13, 0, Math.PI * 2);
    bgx.fill();
    bgx.fillStyle = "#3E8FD0";
    bgx.beginPath();
    bgx.arc(cx, cy, 11, 0, Math.PI * 2);
    bgx.fill();
    px(bgx, cx - 2, cy - 4, 4, 6, C.stone);
    px(bgx, cx - 3, cy - 5, 6, 2, C.stoneDark);
  }

  // A small ring track — a rectangle with two corners chamfered so it reads
  // as more than a plain box — tucked off the island's east edge. Its right
  // side (past x=464) actually pokes off the walkable island into the sky,
  // so it reads as a hazy loop glimpsed just beyond the map.
  // Pushed further right so most of the ring sits past the island's edge
  // (x464) — only its western sliver is clearly on solid ground, the rest
  // runs into the sky margin and off the canvas entirely (paintF1Fade below
  // washes it out to cloud-white before it gets there).
  const F1_OUTER = [
    [432, 100], [492, 100], [508, 116], [508, 160], [448, 160], [432, 144],
  ];
  const F1_INNER = [
    [446, 114], [484, 114], [494, 124], [494, 146], [456, 146], [446, 136],
  ];
  const F1_CENTRE = [
    [439, 107], [488, 107], [501, 120], [501, 153], [452, 153], [439, 140],
  ];

  function fillPolygon(g, pts, style) {
    g.fillStyle = style;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fill();
  }

  function strokePolygon(g, pts, style, width) {
    g.strokeStyle = style;
    g.lineWidth = width;
    g.lineJoin = "miter";
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.stroke();
  }

  function drawKerb(kx, ky) {
    px(bgx, kx - 2, ky - 2, 2, 2, C.white);
    px(bgx, kx, ky - 2, 2, 2, "#D9534F");
    px(bgx, kx - 2, ky, 2, 2, "#D9534F");
    px(bgx, kx, ky, 2, 2, C.white);
  }

  function paintF1Track() {
    // soft shadow
    bgx.save();
    bgx.translate(2, 3);
    fillPolygon(bgx, F1_OUTER, "rgba(20,20,42,0.16)");
    bgx.restore();

    // outer asphalt block + ink outline
    fillPolygon(bgx, F1_OUTER, "#3A3A44");
    strokePolygon(bgx, F1_OUTER, C.ink, 2);
    px(bgx, 434, 100, 56, 2, "#4C4C58"); // top highlight

    // grass infield cut into the middle to form the ring
    fillPolygon(bgx, F1_INNER, C.grass);
    for (let i = 0; i < 5; i++) {
      const rx = 448 + Math.floor(h2(i, 41) * 42);
      const ry = 116 + Math.floor(h2(41, i) * 26);
      px(bgx, rx, ry, 2, 1, C.grassDark);
    }
    strokePolygon(bgx, F1_INNER, "#26262E", 1);

    // checkered start/finish crossing the west straight (still clear of fog)
    for (let cx = 0; cx < 4; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        px(bgx, 433 + cx * 3, 120 + cy * 6, 3, 6, (cx + cy) % 2 ? C.white : C.ink);
      }
    }

    // red/white kerbs on the two visible sharp corners
    drawKerb(432, 100);
    drawKerb(448, 160);

    // fade the eastern half of the ring into the cloud bank before it hits
    // the island's edge / canvas boundary
    const fade = bgx.createLinearGradient(452, 0, 480, 0);
    fade.addColorStop(0, "rgba(196,216,238,0)");
    fade.addColorStop(0.5, "rgba(214,226,242,0.55)");
    fade.addColorStop(1, "rgba(255,255,255,0.96)");
    bgx.fillStyle = fade;
    bgx.fillRect(452, 96, 28, 68);

    // signpost on solid ground south of the track, clear of Workshop's zone,
    // plus a checkered flag
    drawSign(444, 168, "F1", C.gold);
    px(bgx, 464, 162, 1, 13, C.woodDark);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        px(bgx, 465 + c * 2, 162 + r * 2, 2, 2, (r + c) % 2 ? C.ink : C.white);
      }
    }
  }

  // centreline of the F1 ring, used by the animated toy car below
  const F1_LOOP = (() => {
    const legs = [];
    let total = 0;
    for (let i = 0; i < F1_CENTRE.length; i++) {
      const a = F1_CENTRE[i];
      const b = F1_CENTRE[(i + 1) % F1_CENTRE.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      legs.push({ a, b, len, start: total });
      total += len;
    }
    return { legs, total };
  })();

  function f1CarPosition(t) {
    const speed = 34; // px/s
    const d = ((t / 1000) * speed) % F1_LOOP.total;
    for (const leg of F1_LOOP.legs) {
      if (d <= leg.start + leg.len) {
        const f = leg.len === 0 ? 0 : (d - leg.start) / leg.len;
        const px_ = leg.a[0] + (leg.b[0] - leg.a[0]) * f;
        const py_ = leg.a[1] + (leg.b[1] - leg.a[1]) * f;
        return { x: px_, y: py_, angle: Math.atan2(leg.b[1] - leg.a[1], leg.b[0] - leg.a[0]) };
      }
    }
    return { x: F1_LOOP.legs[0].a[0], y: F1_LOOP.legs[0].a[1], angle: 0 };
  }

  function drawF1Car(t) {
    const p = f1CarPosition(t);
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.angle);
    ctx.fillStyle = "#D9534F";
    ctx.fillRect(-4, -2, 8, 4);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-4, -2, 8, 1);
    ctx.fillStyle = "#222";
    ctx.fillRect(-3, -2, 2, 1);
    ctx.fillRect(1, -2, 2, 1);
    ctx.fillRect(-3, 1, 2, 1);
    ctx.fillRect(1, 1, 2, 1);
    ctx.restore();
  }

  // drifting cloud puffs that shroud the track — it's not on the map yet
  const F1_CLOUDS = [
    { x: 476, y: 110, r: 15, phase: 0.0 },
    { x: 468, y: 148, r: 14, phase: 3.1 },
    { x: 455, y: 122, r: 12, phase: 1.6 },
    { x: 460, y: 155, r: 11, phase: 4.6 },
  ];

  function drawF1Clouds(t) {
    ctx.save();
    ctx.filter = "blur(2px)";
    for (const c of F1_CLOUDS) {
      const bob = Math.sin(t / 1900 + c.phase) * 2.5;
      const drift = Math.cos(t / 2600 + c.phase) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(c.x + drift, c.y + bob, c.r, c.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function buildBackground() {
    paintGround();
    paintPaths();
    paintField();
    paintTreesAndBushes();
    paintCiena();
    paintHydro();
    paintTrendAI();
    paintWorkshop();
    paintTower();
    paintFountainBase();
    paintF1Track();
  }

  /* ============================================================
     ANIMATED LAYER
     ============================================================ */

  /* ---------- villager sprites ---------- */
  function drawPerson(g, x, y, shirt, hat, frame, flip) {
    // x,y = feet centre
    g.fillStyle = "rgba(20,20,42,0.25)";
    g.fillRect(Math.round(x - 3), Math.round(y - 1), 6, 2);

    const dir = flip ? -1 : 1;
    const legA = frame ? 3 : 2;
    const legB = frame ? 2 : 3;
    px(g, x - 2, y - legA, 2, legA, "#3A3A4A");
    px(g, x + 1, y - legB, 2, legB, "#3A3A4A");
    px(g, x - 3, y - 8, 7, 5, shirt);
    px(g, x - 3 + (frame ? dir : 0), y - 7, 1, 3, shirt); // swinging arm hint
    px(g, x - 2, y - 11, 5, 3, "#E8B88A");
    px(g, x - 2, y - 13, 5, 2, hat);
    px(g, x - 3, y - 12, 7, 1, hat);
  }

  /* ---------- NPC route walking (collision-aware) ----------
     Villagers walk their waypoint routes, which are laid out to skirt the
     buildings and the fountain. Movement is collision-checked the same way as
     the player (each axis independently), so a villager can never clip into a
     solid — the fountain and buildings physically stop them. */
  function npcBlocked(x, y) {
    if (!inIsland(Math.floor(x / TILE), Math.floor(y / TILE))) return true;
    for (const r of VILLAGE.NPC_SOLID) if (pointInRect(x, y, r)) return true;
    return false;
  }

  const npcs = VILLAGE.NPCS.map((n) => ({
    ...n,
    x: n.route[0][0],
    y: n.route[0][1],
    ti: n.route.length > 1 ? 1 : 0, // waypoint index we're heading toward
    dir: 1,                          // pingpong travel direction along the route
    flip: false,
  }));

  function npcAdvance(npc) {
    const last = npc.route.length - 1;
    if (npc.pingpong) {
      let next = npc.ti + npc.dir;
      if (next > last) { npc.dir = -1; next = npc.ti - 1; }
      else if (next < 0) { npc.dir = 1; next = npc.ti + 1; }
      npc.ti = Math.max(0, Math.min(last, next));
    } else {
      npc.ti = (npc.ti + 1) % npc.route.length;
    }
  }

  function stepNpc(npc, dt) {
    const step = (npc.speed * dt) / 1000;
    const target = npc.route[npc.ti];
    const dx = target[0] - npc.x;
    const dy = target[1] - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= Math.max(1.2, step)) {
      npc.x = target[0];
      npc.y = target[1];
      npcAdvance(npc);
      return;
    }
    const vx = (dx / dist) * step;
    const vy = (dy / dist) * step;
    // axis-separated collision, identical to the player: try X, then Y
    if (!npcBlocked(npc.x + vx, npc.y)) npc.x += vx;
    if (!npcBlocked(npc.x, npc.y + vy)) npc.y += vy;

    if (vx > 0.02) npc.flip = false;
    else if (vx < -0.02) npc.flip = true;
  }

  function updateNpcs(dt) {
    for (const npc of npcs) stepNpc(npc, dt);
  }

  /* ---------- soccer ball state ---------- */
  const ball = { from: 0, to: 1, t0: 0, dur: 900, wait: 600 };

  function ballPosition(t) {
    const P = VILLAGE.PLAYERS;
    const elapsed = t - ball.t0;
    if (elapsed >= ball.dur + ball.wait) {
      ball.from = ball.to;
      let next = Math.floor(Math.random() * P.length);
      if (next === ball.from) next = (next + 1) % P.length;
      ball.to = next;
      ball.t0 = t;
      ball.dur = 700 + Math.random() * 500;
    }
    const f = Math.min(1, (t - ball.t0) / ball.dur);
    const a = P[ball.from];
    const b = P[ball.to];
    return {
      x: a.x + (b.x - a.x) * f + (a.x < b.x ? 4 : -4),
      y: a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * 7,
      kicking: f < 0.18 ? ball.from : f > 0.85 ? ball.to : -1,
    };
  }

  /* ---------- ambient particles ---------- */
  const fireflies = VILLAGE.TREES.slice(0, 9).map((t, i) => ({
    x: t.x + (hash(i) - 0.5) * 24,
    y: t.y - 8 + (hash(i + 50) - 0.5) * 16,
    phase: hash(i + 9) * Math.PI * 2,
    spd: 0.6 + hash(i + 31) * 0.8,
  }));

  const clouds = [
    { x: -80, y: 40, s: 1.0, v: 6 },
    { x: 180, y: 170, s: 1.5, v: 4 },
    { x: 60, y: 260, s: 0.8, v: 8 },
  ];

  function drawCloudShadows(t) {
    ctx.fillStyle = "rgba(20,20,42,0.07)";
    for (const c of clouds) {
      const cx = ((c.x + (t / 1000) * c.v) % (W + 220)) - 110;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, 46 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30 * c.s, c.y + 8, 30 * c.s, 11 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 34 * c.s, c.y + 6, 26 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- animated building bits ---------- */
  function drawWaterWheel(t) {
    const cx = S.hydro.x - 7, cy = S.hydro.y + 34, r = 11;
    const rot = (t / 1000) * 0.9;
    ctx.strokeStyle = "#5E4128";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.woodDark;
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
      px(ctx, cx + Math.cos(a) * r - 1.5, cy + Math.sin(a) * r - 1.5, 3, 3, C.wood);
    }
    px(ctx, cx - 1, cy - 1, 3, 3, "#5E4128");
    // splash where the wheel meets the trough
    if (Math.floor(t / 160) % 2) {
      px(ctx, cx + 3, cy + r - 2, 2, 1, "#BFE3FF");
      px(ctx, cx - 5, cy + r - 1, 2, 1, "#8FD0FF");
    }
  }

  function drawAntennaPulse(t) {
    const ax = S.trendai.x + 28, ay = S.trendai.y - 15;
    const pulse = (Math.sin(t / 350) + 1) / 2;
    px(ctx, ax - 1, ay - 1, 3, 3, pulse > 0.5 ? C.purple : "#5B3CA6");
    if (pulse > 0.65) {
      ctx.strokeStyle = `rgba(139,92,246,${(pulse - 0.65) * 1.6})`;
      ctx.beginPath();
      ctx.arc(ax, ay, 4 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawTowerLights(t) {
    const blink = Math.floor(t / 600) % 2;
    const lights = [ [168, 190], [161, 224], [175, 224], [157, 248], [179, 248] ];
    lights.forEach(([lx, ly], i) => {
      const on = (blink + i) % 2 === 0;
      px(ctx, lx - 1, ly - 1, 2, 2, on ? "#FF3B30" : "#7A1F1A");
      if (on) {
        ctx.fillStyle = "rgba(255,59,48,0.25)";
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawFountainWater(t) {
    const { cx, cy } = VILLAGE.FOUNTAIN;
    // ripple rings
    for (let i = 0; i < 2; i++) {
      const f = ((t / 1400) + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(143,208,255,${0.7 * (1 - f)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + f * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // spout droplets
    for (let i = 0; i < 4; i++) {
      const f = ((t / 700) + i / 4) % 1;
      const dx = (i % 2 ? 1 : -1) * (1 + f * 4);
      px(ctx, cx + dx, cy - 8 + f * 9, 1, 2, f < 0.5 ? "#BFE3FF" : "#8FD0FF");
    }
    px(ctx, cx - 1, cy - 9 - (Math.floor(t / 200) % 2), 2, 3, "#DFF1FF");
  }

  function drawChimneySmoke(t) {
    const sx = S.workshop.x + 45;
    for (let i = 0; i < 3; i++) {
      const f = ((t / 2600) + i / 3) % 1;
      const alpha = 0.5 * (1 - f);
      const size = 2 + f * 4;
      ctx.fillStyle = `rgba(235,238,245,${alpha})`;
      ctx.fillRect(
        Math.round(sx + Math.sin(f * 5 + i) * 3 - size / 2),
        Math.round(S.workshop.y - 14 - f * 16 - size / 2),
        Math.round(size), Math.round(size)
      );
    }
  }

  function drawFireflies(t) {
    for (const f of fireflies) {
      const x = f.x + Math.sin(t / 900 * f.spd + f.phase) * 6;
      const y = f.y + Math.cos(t / 1100 * f.spd + f.phase) * 4;
      const glow = (Math.sin(t / 450 + f.phase * 3) + 1) / 2;
      if (glow < 0.25) continue;
      ctx.fillStyle = `rgba(255,215,0,${0.25 * glow})`;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = `rgba(255,235,130,${0.9 * glow})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  function drawHoverEffect(t) {
    if (!hovered) return;
    const hs = hovered;
    const pulse = (Math.sin(t / 220) + 1) / 2;

    // golden corner brackets
    ctx.fillStyle = `rgba(255,215,0,${0.7 + pulse * 0.3})`;
    const L = 6;
    const corners = [
      [hs.x, hs.y, L, 2], [hs.x, hs.y, 2, L],
      [hs.x + hs.w - L, hs.y, L, 2], [hs.x + hs.w - 2, hs.y, 2, L],
      [hs.x, hs.y + hs.h - 2, L, 2], [hs.x, hs.y + hs.h - L, 2, L],
      [hs.x + hs.w - L, hs.y + hs.h - 2, L, 2], [hs.x + hs.w - 2, hs.y + hs.h - L, 2, L],
    ];
    for (const [cx, cy, cw, ch] of corners) ctx.fillRect(cx, cy, cw, ch);

    // sparkles drifting up
    for (let i = 0; i < 6; i++) {
      const f = ((t / 1000) * 0.9 + i / 6) % 1;
      const sx = hs.x + 3 + hash(i * 13 + Math.floor(t / 1000)) * (hs.w - 6);
      const sy = hs.y + hs.h - f * (hs.h + 6);
      ctx.fillStyle = `rgba(255,225,90,${(1 - f) * 0.9})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      if (f < 0.3) {
        ctx.fillRect(Math.round(sx) - 1, Math.round(sy), 1, 1);
        ctx.fillRect(Math.round(sx) + 1, Math.round(sy), 1, 1);
        ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 1);
      }
    }
  }

  function drawAtmosphere() {
    // golden-hour wash
    ctx.fillStyle = "rgba(255,176,64,0.08)";
    ctx.fillRect(0, 0, W, H);
    const warm = ctx.createLinearGradient(0, 0, W, H * 0.4);
    warm.addColorStop(0, "rgba(255,200,100,0.10)");
    warm.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);

    // sky-tinted vignette toward the cloud edge
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
    v.addColorStop(0, "rgba(184,212,240,0)");
    v.addColorStop(1, "rgba(184,212,240,0.5)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- frame loop ---------- */
  let lastT = 0;
  function frame(t) {
    const dt = lastT ? Math.min(t - lastT, 50) : 16;
    lastT = t;
    updatePlayer(dt);
    updateNpcs(dt);
    updateInteractPrompt();

    ctx.drawImage(bg, 0, 0);

    drawCloudShadows(t);
    drawWaterWheel(t);
    drawAntennaPulse(t);
    drawTowerLights(t);
    drawFountainWater(t);
    drawChimneySmoke(t);
    drawF1Car(t);
    drawF1Clouds(t);

    const walkFrame = Math.floor(t / 220) % 2;

    for (const npc of npcs) {
      drawPerson(ctx, npc.x, npc.y, npc.shirt, npc.hat, walkFrame, npc.flip);
    }

    // the one waiting by the cell tower (idle bob, glances around)
    const w = VILLAGE.WAITER;
    const bob = Math.floor(t / 800) % 2;
    drawPerson(ctx, w.x, w.y - bob * 0.0, w.shirt, w.hat, 0, Math.floor(t / 2600) % 2 === 0);
    if (Math.floor(t / 1300) % 4 === 0) {
      drawMicro(ctx, "...", w.x - 4, w.y - 20, C.white);
    }

    // soccer
    const b = ballPosition(t);
    VILLAGE.PLAYERS.forEach((pl, i) => {
      drawPerson(ctx, pl.x, pl.y, pl.shirt, pl.hat, b.kicking === i ? 1 : walkFrame, pl.x > b.x);
    });
    px(ctx, b.x - 1, b.y - 2, 3, 3, C.white);
    px(ctx, b.x, b.y - 1, 1, 1, "#9AA3B0");

    drawPerson(ctx, player.x, player.y, player.shirt, player.hat, player.moving ? walkFrame : 0, player.flip);

    drawFireflies(t);
    drawHoverEffect(t);
    drawAtmosphere();

    requestAnimationFrame(frame);
  }

  /* ============================================================
     INPUT + UI
     ============================================================ */

  const tooltip = document.getElementById("tooltip");
  const hint = document.getElementById("hint");
  const interactPrompt = document.getElementById("interactPrompt");

  function bufferCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function hitTest(x, y) {
    for (const hs of VILLAGE.HOTSPOTS) {
      if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) return hs;
    }
    return null;
  }

  canvas.addEventListener("pointermove", (e) => {
    const { x, y } = bufferCoords(e);
    const hit = hitTest(x, y);
    if (hit !== hovered) {
      hovered = hit;
      canvas.classList.toggle("point", !!hit);
      if (hit) {
        const rect = canvas.getBoundingClientRect();
        tooltip.textContent = "✦ " + hit.label;
        tooltip.style.left = `${((hit.x + hit.w / 2) / W) * rect.width}px`;
        tooltip.style.top = `${(hit.y / H) * rect.height}px`;
        tooltip.classList.add("on");
      } else {
        tooltip.classList.remove("on");
      }
    }
  });

  canvas.addEventListener("pointerleave", () => {
    hovered = null;
    tooltip.classList.remove("on");
    canvas.classList.remove("point");
  });

  canvas.addEventListener("click", (e) => {
    const { x, y } = bufferCoords(e);
    const hit = hitTest(x, y);
    if (!hit) return;
    if (!hintDismissed) {
      hintDismissed = true;
      hint.classList.add("gone");
    }
    if (hit.id === "tower") openSms();
    else openDialogue(hit.id);
  });

  /* ---------- JRPG dialogue ---------- */
  const dlg = document.getElementById("dialogue");
  const dlgName = document.getElementById("dlgName");
  const dlgText = document.getElementById("dlgText");
  const dlgLinks = document.getElementById("dlgLinks");
  const dlgCue = document.getElementById("dlgCue");
  const dlgBox = dlg.querySelector(".dialogue-box");

  const speech = { pages: [], links: [], page: 0, typing: false, timer: null };

  function typePage() {
    clearInterval(speech.timer);
    const text = speech.pages[speech.page];
    let i = 0;
    speech.typing = true;
    dlgText.textContent = "";
    dlgCue.classList.add("hide");
    dlgLinks.innerHTML = "";
    speech.timer = setInterval(() => {
      i += 1;
      dlgText.textContent = text.slice(0, i);
      if (i >= text.length) finishPage();
    }, 18);
  }

  function finishPage() {
    clearInterval(speech.timer);
    speech.typing = false;
    dlgText.textContent = speech.pages[speech.page];
    const last = speech.page >= speech.pages.length - 1;
    dlgCue.classList.toggle("hide", last);
    if (last && speech.links.length) {
      for (const link of speech.links) {
        const a = document.createElement("a");
        a.href = link.href;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = link.label + " ↗";
        dlgLinks.appendChild(a);
      }
    }
  }

  function openDialogue(id) {
    const d = VILLAGE.DIALOGUE[id];
    if (!d) return;
    speech.pages = d.pages;
    speech.links = d.links || [];
    speech.page = 0;
    dlgName.textContent = d.name;
    dlg.classList.add("open");
    dlg.setAttribute("aria-hidden", "false");
    typePage();
  }

  function advanceDialogue() {
    if (speech.typing) {
      finishPage();
      return;
    }
    if (speech.page < speech.pages.length - 1) {
      speech.page += 1;
      typePage();
    } else {
      closeDialogue();
    }
  }

  function closeDialogue() {
    clearInterval(speech.timer);
    speech.typing = false;
    dlg.classList.remove("open");
    dlg.setAttribute("aria-hidden", "true");
  }

  dlgBox.addEventListener("click", (e) => {
    if (e.target.closest("a") || e.target.closest(".dlg-close")) return;
    advanceDialogue();
  });
  document.getElementById("dlgClose").addEventListener("click", closeDialogue);
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) closeDialogue();
  });

  /* ---------- SMS popup ---------- */
  const sms = document.getElementById("sms");
  const smsBody = document.getElementById("smsBody");
  let smsTimer = null;

  function openSms() {
    sms.classList.add("open");
    sms.setAttribute("aria-hidden", "false");
    clearInterval(smsTimer);
    const text = VILLAGE.SMS_TEXT;
    let i = 0;
    smsBody.textContent = "";
    smsTimer = setInterval(() => {
      i += 1;
      smsBody.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(smsTimer);
    }, 14);
  }

  function closeSms() {
    clearInterval(smsTimer);
    sms.classList.remove("open");
    sms.setAttribute("aria-hidden", "true");
  }

  document.getElementById("smsClose").addEventListener("click", closeSms);
  sms.addEventListener("click", (e) => {
    if (e.target === sms) closeSms();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDialogue();
      closeSms();
      return;
    }
    if (e.key !== "Enter" && e.key !== " " && e.code !== "Space") return;
    if (dlg.classList.contains("open")) {
      e.preventDefault();
      advanceDialogue();
    } else if (!sms.classList.contains("open") && currentZone) {
      e.preventDefault();
      interact();
    }
  });

  /* ============================================================
     PLAYER CHARACTER — walk with WASD/arrows (or the on-screen
     D-pad on touch devices) and step into a building's door gap
     to trigger its dialogue.
     ============================================================ */
  const player = { ...VILLAGE.PLAYER, flip: false, moving: false };
  const keys = new Set();
  const touchDir = { up: false, down: false, left: false, right: false };
  let currentZone = null;

  function pointInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function canStand(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!inIsland(tx, ty)) return false;
    for (const r of VILLAGE.SOLID) {
      if (pointInRect(x, y, r)) return false;
    }
    return true;
  }

  // Track which building doorway the player is standing in. Nothing pops up
  // on its own — the player must press Space (see interact()) to open it.
  function checkTriggers() {
    const hit = VILLAGE.TRIGGERS.find((z) => pointInRect(player.x, player.y, z));
    currentZone = hit ? hit.id : null;
  }

  // Space / Enter while standing in a doorway opens that building.
  function interact() {
    if (!currentZone) return;
    if (dlg.classList.contains("open") || sms.classList.contains("open")) return;
    dismissHint();
    if (currentZone === "tower") openSms();
    else openDialogue(currentZone);
  }

  // Floating "PRESS SPACE" nudge above the player while in a doorway.
  function updateInteractPrompt() {
    if (!interactPrompt) return;
    const canPrompt =
      currentZone &&
      !dlg.classList.contains("open") &&
      !sms.classList.contains("open");
    interactPrompt.classList.toggle("on", !!canPrompt);
    if (canPrompt) {
      interactPrompt.style.left = `${player.x * dispScale}px`;
      interactPrompt.style.top = `${(player.y - 15) * dispScale}px`;
    }
  }

  function isKeyDown(codes) {
    return codes.some((c) => keys.has(c));
  }

  function updatePlayer(dt) {
    if (dlg.classList.contains("open") || sms.classList.contains("open")) {
      player.moving = false;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (isKeyDown(["ArrowLeft", "KeyA"]) || touchDir.left) dx -= 1;
    if (isKeyDown(["ArrowRight", "KeyD"]) || touchDir.right) dx += 1;
    if (isKeyDown(["ArrowUp", "KeyW"]) || touchDir.up) dy -= 1;
    if (isKeyDown(["ArrowDown", "KeyS"]) || touchDir.down) dy += 1;

    player.moving = dx !== 0 || dy !== 0;
    if (player.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (dx > 0) player.flip = false;
      else if (dx < 0) player.flip = true;
    }

    const dist = (player.speed * dt) / 1000;
    const nx = player.x + dx * dist;
    const ny = player.y + dy * dist;
    if (canStand(nx, player.y)) player.x = nx;
    if (canStand(player.x, ny)) player.y = ny;

    checkTriggers();
  }

  function dismissHint() {
    if (!hintDismissed) {
      hintDismissed = true;
      hint.classList.add("gone");
    }
  }

  const MOVE_CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
  document.addEventListener("keydown", (e) => {
    if (!MOVE_CODES.includes(e.code)) return;
    keys.add(e.code);
    dismissHint();
    e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  const dpad = document.getElementById("dpad");
  if (dpad) {
    dpad.querySelectorAll(".dpad-btn").forEach((btn) => {
      const dir = btn.dataset.dir;
      const start = (e) => {
        e.preventDefault();
        touchDir[dir] = true;
        dismissHint();
      };
      const end = (e) => {
        e.preventDefault();
        touchDir[dir] = false;
      };
      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointerleave", end);
      btn.addEventListener("pointercancel", end);
    });
  }

  /* ---------- responsive scaling ---------- */
  function resize() {
    // The HUD title/hint float on top of the canvas (fixed, own z-index),
    // so they only need a sliver of clearance, not a dedicated layout band —
    // this lets the island fill nearly the whole viewport instead of sitting
    // as a small letterboxed scene.
    const pad = 10;
    const topRoom = 16;
    const bottomRoom = 16;
    const availW = window.innerWidth - pad * 2;
    const availH = window.innerHeight - topRoom - bottomRoom;
    dispScale = Math.max(0.5, Math.min(availW / W, availH / H));
    canvas.style.width = `${Math.round(W * dispScale)}px`;
    canvas.style.height = `${Math.round(H * dispScale)}px`;
  }

  window.addEventListener("resize", resize);

  /* ---------- boot ---------- */
  buildBackground();
  resize();
  requestAnimationFrame(frame);
})();
