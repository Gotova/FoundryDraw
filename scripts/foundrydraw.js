/**
 * FoundryDraw – Magic Circle Painter
 * A drawing canvas for painting magic circles in Foundry VTT v13.
 */

const MODULE_ID = "foundrydraw";

/* ──────────────────────────────────────────────
   Application
   ────────────────────────────────────────────── */

class FoundryDrawApp extends Application {
  constructor(options = {}) {
    super(options);

    // Canvas state
    this._history    = [];   // undo stack (ImageData snapshots)
    this._redoStack  = [];
    this._drawing    = false;
    this._lastX      = 0;
    this._lastY      = 0;
    this._startX     = 0;   // for shape tools
    this._startY     = 0;

    // Tool state
    this._tool       = "brush";
    this._color      = "#a855f7";
    this._brushSize  = 8;
    this._opacity    = 1.0;
    this._symmetry   = 1;    // number of rotational segments
    this._background = "black";
  }

  /* ── Application boilerplate ── */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "foundrydraw-app",
      title:       game.i18n.localize("FOUNDRYDRAW.WindowTitle"),
      template:    null,          // we build HTML ourselves
      classes:     ["foundrydraw-app"],
      width:       820,
      height:      640,
      resizable:   true,
      minimizable: true,
    });
  }

  /* Build the inner HTML without a Handlebars template so we stay dependency-free. */
  async _renderInner() {
    const i18n = (k) => game.i18n.localize(`FOUNDRYDRAW.${k}`);

    const html = `
<div class="foundrydraw-toolbar">

  <!-- Tool group -->
  <button class="fd-tool-btn active" data-tool="brush"   data-tooltip="${i18n("Tools.Brush")}">
    <i class="fas fa-paint-brush"></i>
  </button>
  <button class="fd-tool-btn" data-tool="eraser"  data-tooltip="${i18n("Tools.Eraser")}">
    <i class="fas fa-eraser"></i>
  </button>
  <button class="fd-tool-btn" data-tool="line"    data-tooltip="${i18n("Tools.Line")}">
    <i class="fas fa-minus"></i>
  </button>
  <button class="fd-tool-btn" data-tool="circle"  data-tooltip="${i18n("Tools.Circle")}">
    <i class="fas fa-circle-notch"></i>
  </button>
  <button class="fd-tool-btn" data-tool="rect"    data-tooltip="${i18n("Tools.Rectangle")}">
    <i class="fas fa-square"></i>
  </button>
  <button class="fd-tool-btn" data-tool="fill"    data-tooltip="${i18n("Tools.Fill")}">
    <i class="fas fa-fill-drip"></i>
  </button>

  <div class="separator"></div>

  <!-- Color -->
  <div class="fd-color-btn" data-tooltip="${i18n("Settings.Color")}" title="${i18n("Settings.Color")}">
    <input type="color" id="fd-color-picker" value="${this._color}">
  </div>

  <div class="separator"></div>

  <!-- Brush size -->
  <div class="fd-slider-group">
    <label>${i18n("Settings.BrushSize")}</label>
    <input type="range" id="fd-brush-size" min="1" max="80" value="${this._brushSize}">
    <span class="fd-val" id="fd-brush-size-val">${this._brushSize}</span>
  </div>

  <!-- Opacity -->
  <div class="fd-slider-group">
    <label>${i18n("Settings.Opacity")}</label>
    <input type="range" id="fd-opacity" min="1" max="100" value="${Math.round(this._opacity * 100)}">
    <span class="fd-val" id="fd-opacity-val">${Math.round(this._opacity * 100)}%</span>
  </div>

  <div class="separator"></div>

  <!-- Symmetry -->
  <div class="fd-slider-group">
    <label>${i18n("Settings.Symmetry")}</label>
    <select class="fd-select" id="fd-symmetry">
      <option value="1">${i18n("Settings.SymmetryNone")}</option>
      <option value="2">${i18n("Settings.Symmetry2")}</option>
      <option value="4">${i18n("Settings.Symmetry4")}</option>
      <option value="6" selected>${i18n("Settings.Symmetry6")}</option>
      <option value="8">${i18n("Settings.Symmetry8")}</option>
      <option value="12">${i18n("Settings.Symmetry12")}</option>
    </select>
  </div>

  <!-- Background -->
  <div class="fd-slider-group">
    <label>${i18n("Settings.Background")}</label>
    <select class="fd-select" id="fd-background">
      <option value="black" selected>${i18n("Settings.BgBlack")}</option>
      <option value="white">${i18n("Settings.BgWhite")}</option>
      <option value="transparent">${i18n("Settings.BgTransparent")}</option>
    </select>
  </div>

  <div class="separator"></div>

  <!-- History -->
  <button class="fd-tool-btn" id="fd-undo" data-tooltip="${i18n("Actions.Undo")}">
    <i class="fas fa-undo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-redo" data-tooltip="${i18n("Actions.Redo")}">
    <i class="fas fa-redo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clear" data-tooltip="${i18n("Actions.Clear")}">
    <i class="fas fa-trash"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save" data-tooltip="${i18n("Actions.Save")}">
    <i class="fas fa-download"></i>
  </button>

</div>

<div class="foundrydraw-canvas-wrap" id="fd-canvas-wrap">
  <canvas id="foundrydraw-canvas" width="700" height="500"></canvas>
  <canvas id="foundrydraw-overlay" width="700" height="500"></canvas>
</div>

<div class="foundrydraw-status">
  <span class="fd-coords" id="fd-coords">x: 0  y: 0</span>
  <span id="fd-history-info">Undo: 0</span>
</div>`;

    // ApplicationV1 expects a jQuery object as the inner content
    return $(html);
  }

  /* ── Lifecycle ── */

  activateListeners(html) {
    super.activateListeners(html);

    this._canvas  = html.find("#foundrydraw-canvas")[0];
    this._overlay = html.find("#foundrydraw-overlay")[0];
    this._ctx     = this._canvas.getContext("2d");
    this._octx    = this._overlay.getContext("2d");
    this._wrap    = html.find("#fd-canvas-wrap")[0];

    this._initCanvas();
    this._bindControls(html);
    this._bindCanvasEvents();
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this._wrap);
  }

  async close(options = {}) {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    return super.close(options);
  }

  /* ──────────────────────────────────────────────
     Canvas Initialisation
     ────────────────────────────────────────────── */

  _initCanvas() {
    this._fillBackground();
    this._saveHistory();
  }

  _fillBackground() {
    const ctx = this._ctx;
    const { width, height } = this._canvas;
    if (this._background === "transparent") {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = this._background;
      ctx.fillRect(0, 0, width, height);
    }
  }

  _onResize() {
    // Keep overlay aligned with canvas
    if (!this._canvas || !this._overlay) return;
    const rect = this._canvas.getBoundingClientRect();
    this._overlay.style.left = this._canvas.offsetLeft + "px";
    this._overlay.style.top  = this._canvas.offsetTop  + "px";
  }

  /* ──────────────────────────────────────────────
     Control Bindings
     ────────────────────────────────────────────── */

  _bindControls(html) {
    // Tool buttons
    html.find(".fd-tool-btn[data-tool]").on("click", (e) => {
      const btn = e.currentTarget;
      html.find(".fd-tool-btn[data-tool]").removeClass("active");
      btn.classList.add("active");
      this._tool = btn.dataset.tool;
      this._wrap.className = `foundrydraw-canvas-wrap tool-${this._tool}`;
    });

    // Color
    html.find("#fd-color-picker").on("input", (e) => {
      this._color = e.currentTarget.value;
    });

    // Brush size
    html.find("#fd-brush-size").on("input", (e) => {
      this._brushSize = parseInt(e.currentTarget.value);
      html.find("#fd-brush-size-val").text(this._brushSize);
    });

    // Opacity
    html.find("#fd-opacity").on("input", (e) => {
      this._opacity = parseInt(e.currentTarget.value) / 100;
      html.find("#fd-opacity-val").text(`${Math.round(this._opacity * 100)}%`);
    });

    // Symmetry
    html.find("#fd-symmetry").on("change", (e) => {
      this._symmetry = parseInt(e.currentTarget.value);
    });
    this._symmetry = 6; // default

    // Background
    html.find("#fd-background").on("change", (e) => {
      this._background = e.currentTarget.value;
      const snapshot = this._saveHistory(); // save current drawing
      this._fillBackground();
      // redraw stored drawing on top – just clear and re-fill for simplicity
      // (background only affects the cleared state, not existing strokes)
    });

    // Undo / Redo
    html.find("#fd-undo").on("click", () => this._undo());
    html.find("#fd-redo").on("click", () => this._redo());

    // Clear
    html.find("#fd-clear").on("click", () => {
      if (!confirm(game.i18n.localize("FOUNDRYDRAW.Actions.ClearConfirm"))) return;
      this._saveHistory();
      this._redoStack = [];
      this._fillBackground();
      this._updateHistoryInfo();
    });

    // Save
    html.find("#fd-save").on("click", () => this._saveImage());

    // Keyboard shortcuts
    $(document).on(`keydown.${MODULE_ID}`, (e) => {
      if (!this._rendered) return;
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); this._undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); this._redo(); }
      if (e.ctrlKey && e.shiftKey && e.key === "Z") { e.preventDefault(); this._redo(); }
    });
  }

  /* ──────────────────────────────────────────────
     Canvas Event Handling
     ────────────────────────────────────────────── */

  _bindCanvasEvents() {
    const el = this._canvas;

    el.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    el.addEventListener("pointermove", (e) => this._onPointerMove(e));
    el.addEventListener("pointerup",   (e) => this._onPointerUp(e));
    el.addEventListener("pointerleave",(e) => { if (this._drawing) this._onPointerUp(e); });
    el.addEventListener("mousemove",   (e) => this._updateCoords(e));
  }

  _canvasPoint(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width  / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  _updateCoords(e) {
    const p = this._canvasPoint(e);
    const el = document.getElementById("fd-coords");
    if (el) el.textContent = `x: ${Math.round(p.x)}  y: ${Math.round(p.y)}`;
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._canvas.setPointerCapture(e.pointerId);
    this._drawing = true;
    const p = this._canvasPoint(e);
    this._startX = this._lastX = p.x;
    this._startY = this._lastY = p.y;

    this._saveHistory();
    this._redoStack = [];

    if (this._tool === "fill") {
      this._floodFill(Math.round(p.x), Math.round(p.y));
      this._drawing = false;
      this._updateHistoryInfo();
    } else if (this._tool === "brush" || this._tool === "eraser") {
      this._dot(p.x, p.y);
    }
  }

  _onPointerMove(e) {
    if (!this._drawing) return;
    const p = this._canvasPoint(e);

    if (this._tool === "brush" || this._tool === "eraser") {
      this._stroke(this._lastX, this._lastY, p.x, p.y);
      this._lastX = p.x;
      this._lastY = p.y;
    } else {
      // Shape preview on overlay
      this._octx.clearRect(0, 0, this._overlay.width, this._overlay.height);
      this._drawShape(this._octx, this._startX, this._startY, p.x, p.y);
    }
  }

  _onPointerUp(e) {
    if (!this._drawing) return;
    this._drawing = false;
    const p = this._canvasPoint(e);

    if (["line","circle","rect"].includes(this._tool)) {
      this._octx.clearRect(0, 0, this._overlay.width, this._overlay.height);
      this._drawShape(this._ctx, this._startX, this._startY, p.x, p.y);
    }
    this._updateHistoryInfo();
  }

  /* ──────────────────────────────────────────────
     Drawing Primitives
     ────────────────────────────────────────────── */

  _applyBrushStyle(ctx, eraser = false) {
    ctx.globalAlpha = eraser ? 1.0 : this._opacity;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = this._color;
    ctx.fillStyle   = this._color;
    ctx.lineWidth   = this._brushSize;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }

  _dot(x, y) {
    this._withSymmetry(x, y, (cx, cy, tx, ty) => {
      const ctx = this._ctx;
      this._applyBrushStyle(ctx, this._tool === "eraser");
      ctx.beginPath();
      ctx.arc(tx, ty, this._brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _stroke(x1, y1, x2, y2) {
    this._withSymmetry(x1, y1, (cx, cy, tx1, ty1) => {
      // mirror x2/y2 the same way
      const dx = x2 - cx, dy = y2 - cy;
      // The symmetry transform that was applied to (x1,y1) → (tx1,ty1)
      // We derive the rotation angle from the difference
      const origAngle = Math.atan2(ty1 - cy, tx1 - cx);
      const newAngle  = Math.atan2(dy, dx) + (origAngle - Math.atan2(y1 - cy, x1 - cx));
      const r2 = Math.hypot(dx, dy);
      const tx2 = cx + r2 * Math.cos(newAngle);
      const ty2 = cy + r2 * Math.sin(newAngle);

      const ctx = this._ctx;
      this._applyBrushStyle(ctx, this._tool === "eraser");
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    });
  }

  /** Calls callback for each symmetry segment, passing (centerX, centerY, transformedX, transformedY). */
  _withSymmetry(x, y, fn) {
    const cx = this._canvas.width  / 2;
    const cy = this._canvas.height / 2;
    const dx = x - cx, dy = y - cy;
    const baseAngle = Math.atan2(dy, dx);
    const r = Math.hypot(dx, dy);
    const step = (Math.PI * 2) / this._symmetry;
    for (let i = 0; i < this._symmetry; i++) {
      const angle = baseAngle + step * i;
      const tx = cx + r * Math.cos(angle);
      const ty = cy + r * Math.sin(angle);
      fn(cx, cy, tx, ty);
    }
  }

  _drawShape(ctx, x1, y1, x2, y2) {
    const isOverlay = ctx === this._octx;
    if (!isOverlay) this._applyBrushStyle(ctx, false);
    else {
      ctx.globalAlpha = this._opacity;
      ctx.strokeStyle = this._color;
      ctx.fillStyle   = this._color;
      ctx.lineWidth   = this._brushSize;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }

    const cx = this._canvas.width  / 2;
    const cy = this._canvas.height / 2;
    const step = (Math.PI * 2) / this._symmetry;
    const dx1 = x1 - cx, dy1 = y1 - cy;
    const dx2 = x2 - cx, dy2 = y2 - cy;
    const r1 = Math.hypot(dx1, dy1), r2 = Math.hypot(dx2, dy2);
    const a1 = Math.atan2(dy1, dx1), a2 = Math.atan2(dy2, dx2);

    for (let i = 0; i < this._symmetry; i++) {
      const rot = step * i;
      const sx1 = cx + r1 * Math.cos(a1 + rot);
      const sy1 = cy + r1 * Math.sin(a1 + rot);
      const sx2 = cx + r2 * Math.cos(a2 + rot);
      const sy2 = cy + r2 * Math.sin(a2 + rot);

      ctx.beginPath();
      if (this._tool === "line") {
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      } else if (this._tool === "circle") {
        const rx = Math.abs(sx2 - sx1) / 2;
        const ry = Math.abs(sy2 - sy1) / 2;
        const ex = (sx1 + sx2) / 2;
        const ey = (sy1 + sy2) / 2;
        ctx.ellipse(ex, ey, rx || 1, ry || 1, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this._tool === "rect") {
        ctx.rect(sx1, sy1, sx2 - sx1, sy2 - sy1);
        ctx.stroke();
      }
    }
  }

  /* ──────────────────────────────────────────────
     Flood Fill
     ────────────────────────────────────────────── */

  _floodFill(startX, startY) {
    const ctx  = this._ctx;
    const w    = this._canvas.width;
    const h    = this._canvas.height;
    const data = ctx.getImageData(0, 0, w, h);
    const px   = data.data;

    const idx = (x, y) => (y * w + x) * 4;
    const target = px.slice(idx(startX, startY), idx(startX, startY) + 4);

    // Parse fill color
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 1;
    const tc = tmp.getContext("2d");
    tc.fillStyle = this._color;
    tc.fillRect(0, 0, 1, 1);
    const fill = tc.getImageData(0, 0, 1, 1).data;

    const match = (i) =>
      px[i]   === target[0] &&
      px[i+1] === target[1] &&
      px[i+2] === target[2] &&
      px[i+3] === target[3];

    if (match(idx(startX, startY)) &&
        fill[0] === target[0] && fill[1] === target[1] &&
        fill[2] === target[2] && fill[3] === target[3]) return;

    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const i = idx(x, y);
      if (!match(i)) continue;
      px[i]   = fill[0];
      px[i+1] = fill[1];
      px[i+2] = fill[2];
      px[i+3] = Math.round(fill[3] * this._opacity);
      stack.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
    }
    ctx.putImageData(data, 0, 0);
  }

  /* ──────────────────────────────────────────────
     History (Undo / Redo)
     ────────────────────────────────────────────── */

  _saveHistory() {
    if (!this._ctx) return;
    const snap = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    this._history.push(snap);
    if (this._history.length > 50) this._history.shift();
    this._updateHistoryInfo();
  }

  _undo() {
    if (this._history.length <= 1) return;
    const current = this._history.pop();
    this._redoStack.push(current);
    const prev = this._history[this._history.length - 1];
    this._ctx.putImageData(prev, 0, 0);
    this._updateHistoryInfo();
  }

  _redo() {
    if (!this._redoStack.length) return;
    const next = this._redoStack.pop();
    this._history.push(next);
    this._ctx.putImageData(next, 0, 0);
    this._updateHistoryInfo();
  }

  _updateHistoryInfo() {
    const el = document.getElementById("fd-history-info");
    if (el) el.textContent = `Undo: ${this._history.length - 1}  Redo: ${this._redoStack.length}`;
  }

  /* ──────────────────────────────────────────────
     Save Image
     ────────────────────────────────────────────── */

  _saveImage() {
    const link = document.createElement("a");
    link.download = `magic-circle-${Date.now()}.png`;
    link.href = this._canvas.toDataURL("image/png");
    link.click();
  }
}

/* ──────────────────────────────────────────────
   Singleton instance + UI button injection
   ────────────────────────────────────────────── */

let _appInstance = null;

function openDrawApp() {
  if (!_appInstance || !_appInstance.rendered) {
    _appInstance = new FoundryDrawApp();
  }
  _appInstance.render(true);
}

/* Inject button into the scene controls sidebar (visible to all players). */
Hooks.on("getSceneControlButtons", (controls) => {
  // Find the "basic" token controls group or push to the first group
  const group = controls.find((c) => c.name === "token") ?? controls[0];
  if (!group) return;

  group.tools.push({
    name:    "foundrydraw",
    title:   game.i18n.localize("FOUNDRYDRAW.ButtonTitle"),
    icon:    "fas fa-magic",
    button:  true,
    visible: true,
    onClick: () => openDrawApp(),
  });
});

/* Also inject a plain toolbar button next to the scene controls (v13 Players HUD).
   This fires after the controls are rendered so we add a sibling button. */
Hooks.on("renderSceneControls", (app, html) => {
  // Avoid duplicate injection
  if (html.find("#foundrydraw-btn").length) return;

  const btn = $(`
    <li id="foundrydraw-btn" class="scene-control" title="${game.i18n.localize("FOUNDRYDRAW.ButtonTitle")}">
      <i class="fas fa-magic"></i>
    </li>
  `);
  btn.on("click", () => openDrawApp());
  html.find("ol.scene-controls, #scene-controls > ol").first().prepend(btn);
});

/* Cleanup keyboard listeners when app closes */
Hooks.on("closeFoundryDrawApp", () => {
  $(document).off(`keydown.${MODULE_ID}`);
});
