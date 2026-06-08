/**
 * FoundryDraw - Magic Circle Painter
 * A drawing canvas for painting magic circles in Foundry VTT v13.
 */

const MODULE_ID = "foundrydraw";

// ─── Virtual canvas ───────────────────────────────────────────────────────────
// All drawing happens on a fixed-size world canvas.  The display canvas is just
// a zoomed/panned viewport into the world – resizing the window never touches
// the world canvas, so the symmetry centre can never drift.
const WORLD_SIZE  = 2000;   // world canvas is WORLD_SIZE × WORLD_SIZE pixels
const MAX_HISTORY = 20;     // undo/redo depth
const ZOOM_MIN    = 0.1;
const ZOOM_MAX    = 8.0;
const ZOOM_FACTOR = 1.15;   // multiplier per scroll tick

/* ──────────────────────────────────────────────
   Settings
   ────────────────────────────────────────────── */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "gallery", {
    scope:   "world",
    config:  false,
    type:    Array,
    default: [],
  });
});

/* ──────────────────────────────────────────────
   Application
   ────────────────────────────────────────────── */

class FoundryDrawApp extends Application {
  constructor(options = {}) {
    super(options);

    this._history   = [];
    this._redoStack = [];
    this._drawing   = false;
    this._panning   = false;
    this._lastX     = 0;   // world coords
    this._lastY     = 0;
    this._startX    = 0;
    this._startY    = 0;
    this._panLastX  = 0;   // client coords for panning
    this._panLastY  = 0;

    this._tool       = "brush";
    this._color      = "#030821";
    this._brushSize  = 4;
    this._smoothness = 0;   // 0 = off, 1-10 = increasing stabilisation
    this._smoothX    = 0;   // stabilised draw position (world coords)
    this._smoothY    = 0;
    this._opacity    = 1.0;
    this._symmetry   = 1;
    this._keyHandler = null;

    // Viewport state
    this._zoom  = 1.0;
    this._viewX = 0;   // world-x at the top-left of the viewport
    this._viewY = 0;   // world-y at the top-left of the viewport

    this._circleCount      = 0;
    this._baseCircleRadius = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "foundrydraw-app",
      title:       game.i18n.localize("FOUNDRYDRAW.WindowTitle"),
      template:    null,
      classes:     ["foundrydraw-app"],
      width:       820,
      height:      700,
      resizable:   true,
      minimizable: true,
    });
  }

  async _renderInner() {
    const i18n = (k) => game.i18n.localize(`FOUNDRYDRAW.${k}`);

    const html = `
<div class="foundrydraw-toolbar">

  <button class="fd-tool-btn active" data-tool="brush"  data-tooltip="${i18n("Tools.Brush")}">
    <i class="fas fa-paint-brush"></i>
  </button>
  <button class="fd-tool-btn" data-tool="eraser"        data-tooltip="${i18n("Tools.Eraser")}">
    <i class="fas fa-eraser"></i>
  </button>
  <button class="fd-tool-btn" data-tool="line"          data-tooltip="${i18n("Tools.Line")}">
    <i class="fas fa-minus"></i>
  </button>
  <button class="fd-tool-btn" data-tool="circle"        data-tooltip="${i18n("Tools.Circle")}">
    <i class="fas fa-circle-notch"></i>
  </button>
  <button class="fd-tool-btn" data-tool="rect"          data-tooltip="${i18n("Tools.Rectangle")}">
    <i class="fas fa-square"></i>
  </button>
  <button class="fd-tool-btn" data-tool="fill"          data-tooltip="${i18n("Tools.Fill")}">
    <i class="fas fa-fill-drip"></i>
  </button>

  <div class="separator"></div>

  <div class="fd-color-btn" title="${i18n("Settings.Color")}">
    <input type="color" id="fd-color-picker" value="#030821">
  </div>

  <div class="separator"></div>

  <div class="fd-slider-group">
    <label>${i18n("Settings.BrushSize")}</label>
    <input type="range" id="fd-brush-size" min="1" max="20" value="${this._brushSize}">
    <span class="fd-val" id="fd-brush-size-val">${this._brushSize}</span>
  </div>

  <div class="fd-slider-group">
    <label>${i18n("Settings.Smoothness")}</label>
    <input type="range" id="fd-smooth" min="0" max="10" value="${this._smoothness}">
    <span class="fd-val" id="fd-smooth-val">${this._smoothness}</span>
  </div>

  <div class="separator"></div>

  <div class="fd-slider-group">
    <label>${i18n("Settings.Symmetry")}</label>
    <select class="fd-select" id="fd-symmetry">
      <option value="1"  selected>${i18n("Settings.SymmetryNone")}</option>
      <option value="2">${i18n("Settings.Symmetry2")}</option>
      <option value="4">${i18n("Settings.Symmetry4")}</option>
      <option value="6">${i18n("Settings.Symmetry6")}</option>
      <option value="8">${i18n("Settings.Symmetry8")}</option>
      <option value="12">${i18n("Settings.Symmetry12")}</option>
    </select>
  </div>

  <div class="separator"></div>

  <button class="fd-tool-btn" id="fd-undo"          data-tooltip="${i18n("Actions.Undo")}">
    <i class="fas fa-undo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-redo"          data-tooltip="${i18n("Actions.Redo")}">
    <i class="fas fa-redo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-insert-circle" data-tooltip="${i18n("Actions.InsertCircle")}">
    <i class="fas fa-circle-plus"></i>
  </button>
  <button class="fd-tool-btn" id="fd-center-view"   data-tooltip="${i18n("Actions.CenterView")}">
    <i class="fas fa-compress-arrows-alt"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clear"         data-tooltip="${i18n("Actions.Clear")}">
    <i class="fas fa-trash"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clipboard"     data-tooltip="${i18n("Actions.CopyClipboard")}">
    <i class="fas fa-clipboard"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save-gallery"  data-tooltip="${i18n("Actions.SaveGallery")}">
    <i class="fas fa-floppy-disk"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save"          data-tooltip="${i18n("Actions.Save")}">
    <i class="fas fa-download"></i>
  </button>

  ${game.user.isGM ? `
  <div class="separator"></div>
  <button class="fd-tool-btn" id="fd-show-players" data-tooltip="${i18n("Actions.ShowPlayers")}">
    <i class="fas fa-eye"></i>
  </button>` : ""}

</div>

<div class="foundrydraw-canvas-wrap" id="fd-canvas-wrap">
  <canvas id="foundrydraw-canvas"></canvas>
  <canvas id="foundrydraw-overlay"></canvas>
  <div id="fd-center-marker" title="${i18n("Settings.SymmetryCenter")}"><span></span></div>
</div>

<div class="foundrydraw-status">
  <span class="fd-coords" id="fd-coords">x: 0  y: 0</span>
  <span id="fd-zoom-info">100%</span>
  <span id="fd-history-info">Undo: 0</span>
</div>`;

    return $(html);
  }

  /* ── Lifecycle ── */

  activateListeners(html) {
    super.activateListeners(html);

    this._canvas  = document.getElementById("foundrydraw-canvas");
    this._overlay = document.getElementById("foundrydraw-overlay");
    this._wrap    = document.getElementById("fd-canvas-wrap");

    if (!this._canvas || !this._overlay || !this._wrap) {
      console.error(`${MODULE_ID} | canvas elements not found in DOM`);
      return;
    }

    this._ctx  = this._canvas.getContext("2d");
    this._octx = this._overlay.getContext("2d");

    this._initWhenReady(0);
    this._bindControls(html);
    this._bindCanvasEvents();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this._wrap);

    this._keyHandler = (e) => {
      if (!this.rendered) return;
      const focused = document.activeElement;
      if (focused && (
        focused.tagName === "INPUT" ||
        focused.tagName === "TEXTAREA" ||
        focused.isContentEditable
      )) return;
      const isZ = e.key === "z" || e.key === "Z";
      if (e.ctrlKey && isZ && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); this._undo(); return; }
      if (e.ctrlKey && isZ &&  e.shiftKey) { e.preventDefault(); e.stopPropagation(); this._redo(); return; }
      if (e.ctrlKey && e.key === "y")       { e.preventDefault(); e.stopPropagation(); this._redo(); return; }
    };
    document.addEventListener("keydown", this._keyHandler, true);
  }

  setPosition(pos = {}) {
    const result = super.setPosition(pos);
    requestAnimationFrame(() => this._onResize());
    return result;
  }

  async close(options = {}) {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._keyHandler) document.removeEventListener("keydown", this._keyHandler, true);
    return super.close(options);
  }

  /* ──────────────────────────────────────────────
     Canvas Sizing  (display canvas only)
     ────────────────────────────────────────────── */

  _initWhenReady(attempts) {
    if (!this._wrap) return;
    const w = this._wrap.clientWidth;
    const h = this._wrap.clientHeight;
    if (w <= 0 || h <= 0) {
      if (attempts < 20) setTimeout(() => this._initWhenReady(attempts + 1), 16);
      return;
    }
    this._applyCanvasSize(w, h);
    this._initCanvas();
  }

  /* Resize the display + overlay canvases (does NOT touch the world canvas) */
  _applyCanvasSize(w, h) {
    for (const c of [this._canvas, this._overlay]) {
      c.width        = w;
      c.height       = h;
      c.style.width  = w + "px";
      c.style.height = h + "px";
    }
  }

  /* Window was resized – just resize the display canvas and re-render.
     The world canvas is untouched, so the drawing never moves. */
  _onResize() {
    if (!this._canvas || !this._overlay || !this._world) return;
    const w = this._wrap.clientWidth;
    const h = this._wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    if (this._canvas.width === w && this._canvas.height === h) return;
    this._applyCanvasSize(w, h);
    this._renderViewport();
  }

  /* ──────────────────────────────────────────────
     World Canvas  (the actual drawing surface)
     ────────────────────────────────────────────── */

  _initCanvas() {
    this._world    = document.createElement("canvas");
    this._world.width  = WORLD_SIZE;
    this._world.height = WORLD_SIZE;
    this._worldCtx = this._world.getContext("2d");

    this._fillBackground();
    this._centerView();
    this._history = [];
    this._saveHistory();
    this._renderViewport();
  }

  /* ──────────────────────────────────────────────
     Viewport
     ────────────────────────────────────────────── */

  /* Centre the viewport on the world centre at the current zoom level */
  _centerView() {
    this._viewX = (WORLD_SIZE - this._canvas.width  / this._zoom) / 2;
    this._viewY = (WORLD_SIZE - this._canvas.height / this._zoom) / 2;
  }

  /* Blit the world canvas through the current viewport transform */
  _renderViewport() {
    if (!this._world || !this._ctx) return;
    const ctx = this._ctx;
    const cw  = this._canvas.width;
    const ch  = this._canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(this._zoom, this._zoom);
    ctx.drawImage(this._world, -this._viewX, -this._viewY);
    ctx.restore();

    this._updateCenterMarker();
    this._updateZoomInfo();
  }

  /* Reposition the CSS crosshair element over the current world centre */
  _updateCenterMarker() {
    const marker = document.getElementById("fd-center-marker");
    if (!marker) return;
    const scx = Math.round((WORLD_SIZE / 2 - this._viewX) * this._zoom);
    const scy = Math.round((WORLD_SIZE / 2 - this._viewY) * this._zoom);
    marker.style.left = scx + "px";
    marker.style.top  = scy + "px";
  }

  _updateZoomInfo() {
    const el = document.getElementById("fd-zoom-info");
    if (el) el.textContent = `${Math.round(this._zoom * 100)}%`;
  }

  _fillBackground() {
    const ctx = this._worldCtx;
    const w   = WORLD_SIZE;
    const h   = WORLD_SIZE;
    ctx.globalAlpha              = 1.0;
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "#e8d5a3";
    ctx.fillRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.25,
      w / 2, h / 2, Math.max(w, h) * 0.8
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(60,30,0,0.2)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  /* ──────────────────────────────────────────────
     Coordinate transform
     ────────────────────────────────────────────── */

  /* Convert a point in display-canvas pixels to world pixels */
  _screenToWorld(sx, sy) {
    return {
      x: this._viewX + sx / this._zoom,
      y: this._viewY + sy / this._zoom,
    };
  }

  /* ──────────────────────────────────────────────
     Control Bindings
     ────────────────────────────────────────────── */

  _bindControls(html) {
    html.find(".fd-tool-btn[data-tool]").on("click", (e) => {
      const btn = e.currentTarget;
      html.find(".fd-tool-btn[data-tool]").removeClass("active");
      btn.classList.add("active");
      this._tool = btn.dataset.tool;
      this._wrap.className = `foundrydraw-canvas-wrap tool-${this._tool}`;
    });

    html.find("#fd-color-picker").on("input", (e) => {
      this._color = e.currentTarget.value;
    });

    html.find("#fd-brush-size").on("input", (e) => {
      this._brushSize = parseInt(e.currentTarget.value);
      html.find("#fd-brush-size-val").text(this._brushSize);
    });

    html.find("#fd-smooth").on("input", (e) => {
      this._smoothness = parseInt(e.currentTarget.value);
      html.find("#fd-smooth-val").text(this._smoothness);
    });

    html.find("#fd-symmetry").on("change", (e) => {
      this._symmetry = parseInt(e.currentTarget.value);
    });

    html.find("#fd-undo").on("click", () => this._undo());
    html.find("#fd-redo").on("click", () => this._redo());
    html.find("#fd-insert-circle").on("click", () => this._insertCircleTemplate());

    html.find("#fd-center-view").on("click", () => {
      this._zoom = 1.0;
      this._centerView();
      this._renderViewport();
    });

    html.find("#fd-clear").on("click", () => {
      this._redoStack        = [];
      this._circleCount      = 0;
      this._baseCircleRadius = null;
      this._fillBackground();
      this._saveHistory();
      this._renderViewport();
      this._updateHistoryInfo();
    });

    html.find("#fd-clipboard").on("click",    () => this._copyToClipboard());
    html.find("#fd-save-gallery").on("click", () => this._saveToGallery());
    html.find("#fd-save").on("click",         () => this._saveImage());
    if (game.user.isGM) {
      html.find("#fd-show-players").on("click", () => this._showToPlayers());
    }
  }

  /* ──────────────────────────────────────────────
     Canvas Event Handling
     ────────────────────────────────────────────── */

  _bindCanvasEvents() {
    const el = this._canvas;
    el.addEventListener("contextmenu",   (e) => e.preventDefault());
    el.addEventListener("pointerdown",   (e) => this._onPointerDown(e));
    el.addEventListener("pointermove",   (e) => this._onPointerMove(e));
    el.addEventListener("pointerup",     (e) => this._onPointerUp(e));
    el.addEventListener("pointercancel", ()  => {
      this._drawing = false;
      this._panning = false;
      this._wrap.classList.remove("fd-panning");
    });
    el.addEventListener("pointerleave",  (e) => {
      if (this._drawing) this._onPointerUp(e);
      if (this._panning) { this._panning = false; this._wrap.classList.remove("fd-panning"); }
    });
    el.addEventListener("mousemove",     (e) => this._updateCoords(e));
    el.addEventListener("wheel",         (e) => this._onWheel(e), { passive: false });
  }

  /* Returns the pointer position in display-canvas pixels */
  _canvasPoint(e) {
    const rect   = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width  / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  _updateCoords(e) {
    const sp = this._canvasPoint(e);
    const wp = this._screenToWorld(sp.x, sp.y);
    const el = document.getElementById("fd-coords");
    // Coords relative to the symmetry centre (world centre = 0, 0)
    if (el) el.textContent =
      `x: ${Math.round(wp.x - WORLD_SIZE / 2)}  y: ${Math.round(wp.y - WORLD_SIZE / 2)}`;
  }

  /* ── Zoom ── */

  _onWheel(e) {
    e.preventDefault();
    const factor  = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this._zoom * factor));
    if (newZoom === this._zoom) return;

    // Keep the world-point under the cursor fixed on screen
    const sp     = this._canvasPoint(e);
    this._viewX += sp.x / this._zoom - sp.x / newZoom;
    this._viewY += sp.y / this._zoom - sp.y / newZoom;
    this._zoom   = newZoom;
    this._renderViewport();
  }

  /* ── Pointer events ── */

  _onPointerDown(e) {
    e.preventDefault();

    if (e.button === 2) {
      // Right-click → pan
      this._panning  = true;
      this._panLastX = e.clientX;
      this._panLastY = e.clientY;
      this._canvas.setPointerCapture(e.pointerId);
      this._wrap.classList.add("fd-panning");
      return;
    }
    if (e.button !== 0) return;

    this._canvas.setPointerCapture(e.pointerId);
    this._drawing = true;
    const sp = this._canvasPoint(e);
    const wp = this._screenToWorld(sp.x, sp.y);
    this._startX = this._lastX = wp.x;
    this._startY = this._lastY = wp.y;
    // Initialise stabilised position exactly at the cursor so the first
    // stroke segment starts cleanly regardless of smoothness setting.
    this._smoothX = wp.x;
    this._smoothY = wp.y;
    this._redoStack = [];

    if (this._tool === "fill") {
      this._floodFill(Math.round(wp.x), Math.round(wp.y));
      this._drawing = false;
      this._saveHistory();
      this._renderViewport();
      this._updateHistoryInfo();
    } else if (this._tool === "brush" || this._tool === "eraser") {
      this._dot(wp.x, wp.y);
      this._renderViewport();
    }
  }

  _onPointerMove(e) {
    if (this._panning) {
      const dx      = (e.clientX - this._panLastX) / this._zoom;
      const dy      = (e.clientY - this._panLastY) / this._zoom;
      this._viewX  -= dx;
      this._viewY  -= dy;
      this._panLastX = e.clientX;
      this._panLastY = e.clientY;
      this._renderViewport();
      return;
    }
    if (!this._drawing) return;

    const sp = this._canvasPoint(e);
    const wp = this._screenToWorld(sp.x, sp.y);

    if (this._tool === "brush" || this._tool === "eraser") {
      // Exponential smoothing stabiliser.
      // alpha = 1.0  → draw at exact cursor (no smoothing)
      // alpha = 0.1  → draw 10% of the way to cursor each event (heavy smoothing)
      const alpha    = this._smoothness === 0 ? 1.0 : 1.0 - this._smoothness * 0.09;
      this._smoothX += (wp.x - this._smoothX) * alpha;
      this._smoothY += (wp.y - this._smoothY) * alpha;
      this._stroke(this._lastX, this._lastY, this._smoothX, this._smoothY);
      this._lastX = this._smoothX;
      this._lastY = this._smoothY;
      this._renderViewport();
    } else {
      // Live shape preview on the overlay canvas
      this._octx.clearRect(0, 0, this._overlay.width, this._overlay.height);
      this._octx.save();
      this._octx.scale(this._zoom, this._zoom);
      this._octx.translate(-this._viewX, -this._viewY);
      this._drawShape(this._octx, this._startX, this._startY, wp.x, wp.y);
      this._octx.restore();
    }
  }

  _onPointerUp(e) {
    if (this._panning) {
      this._panning = false;
      this._wrap.classList.remove("fd-panning");
      return;
    }
    if (!this._drawing) return;
    this._drawing = false;

    const sp = this._canvasPoint(e);
    const wp = this._screenToWorld(sp.x, sp.y);

    if (["line", "circle", "rect"].includes(this._tool)) {
      this._octx.clearRect(0, 0, this._overlay.width, this._overlay.height);
      this._drawShape(this._worldCtx, this._startX, this._startY, wp.x, wp.y);
      this._renderViewport();
    } else if ((this._tool === "brush" || this._tool === "eraser") && this._smoothness > 0) {
      // Flush: draw the remaining gap between the last stabilised position
      // and the actual cursor so the stroke always ends where the user lifted.
      if (this._lastX !== wp.x || this._lastY !== wp.y) {
        this._stroke(this._lastX, this._lastY, wp.x, wp.y);
        this._renderViewport();
      }
    }
    this._saveHistory();
    this._updateHistoryInfo();
  }

  /* ──────────────────────────────────────────────
     Drawing Primitives  (all work in world coords)
     ────────────────────────────────────────────── */

  _applyBrushStyle(ctx, eraser = false) {
    ctx.globalAlpha              = eraser ? 1.0 : this._opacity;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle              = this._color;
    ctx.fillStyle                = this._color;
    ctx.lineWidth                = this._brushSize;
    ctx.lineCap                  = "round";
    ctx.lineJoin                 = "round";
  }

  _dot(x, y) {
    this._withSymmetry(x, y, (_cx, _cy, tx, ty) => {
      const ctx = this._worldCtx;
      this._applyBrushStyle(ctx, this._tool === "eraser");
      ctx.beginPath();
      ctx.arc(tx, ty, this._brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _stroke(x1, y1, x2, y2) {
    this._withSymmetry(x1, y1, (cx, cy, tx1, ty1) => {
      const dx        = x2 - cx, dy = y2 - cy;
      const origAngle = Math.atan2(ty1 - cy, tx1 - cx);
      const newAngle  = Math.atan2(dy, dx) + (origAngle - Math.atan2(y1 - cy, x1 - cx));
      const r2        = Math.hypot(dx, dy);
      const tx2       = cx + r2 * Math.cos(newAngle);
      const ty2       = cy + r2 * Math.sin(newAngle);

      const ctx = this._worldCtx;
      this._applyBrushStyle(ctx, this._tool === "eraser");
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    });
  }

  /* Symmetry centre is always the world centre – it never depends on viewport */
  _withSymmetry(x, y, fn) {
    const cx        = WORLD_SIZE / 2;
    const cy        = WORLD_SIZE / 2;
    const dx        = x - cx, dy = y - cy;
    const baseAngle = Math.atan2(dy, dx);
    const r         = Math.hypot(dx, dy);
    const step      = (Math.PI * 2) / this._symmetry;
    for (let i = 0; i < this._symmetry; i++) {
      const angle = baseAngle + step * i;
      fn(cx, cy, cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
  }

  _insertCircleTemplate() {
    const spacing = 50;

    if (this._circleCount === 0) {
      // Derive radius from the visible viewport area so it fits on screen
      this._baseCircleRadius = Math.round(
        Math.min(this._canvas.width, this._canvas.height) / (2 * this._zoom) * 0.85
      );
    }

    const cx = WORLD_SIZE / 2;
    const cy = WORLD_SIZE / 2;
    const r  = this._baseCircleRadius + this._circleCount * spacing;

    this._redoStack = [];
    const ctx = this._worldCtx;
    ctx.globalAlpha              = 1.0;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle              = this._color;
    ctx.lineWidth                = this._brushSize;
    ctx.lineCap                  = "round";
    ctx.lineJoin                 = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    this._circleCount++;
    this._saveHistory();
    this._renderViewport();
    this._updateHistoryInfo();
  }

  /* x1,y1,x2,y2 are world coords.
     When called for the overlay preview the caller applies
     scale(zoom) + translate(-viewX,-viewY) first. */
  _drawShape(ctx, x1, y1, x2, y2) {
    const isOverlay = (ctx === this._octx);
    if (!isOverlay) {
      this._applyBrushStyle(ctx, false);
    } else {
      ctx.globalAlpha              = this._opacity;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle              = this._color;
      ctx.lineWidth                = this._brushSize;
      ctx.lineCap                  = "round";
      ctx.lineJoin                 = "round";
    }

    const cx   = WORLD_SIZE / 2;
    const cy   = WORLD_SIZE / 2;
    const step = (Math.PI * 2) / this._symmetry;
    const dx1  = x1 - cx, dy1 = y1 - cy;
    const dx2  = x2 - cx, dy2 = y2 - cy;
    const r1   = Math.hypot(dx1, dy1), r2 = Math.hypot(dx2, dy2);
    const a1   = Math.atan2(dy1, dx1),  a2 = Math.atan2(dy2, dx2);

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
        ctx.ellipse((sx1 + sx2) / 2, (sy1 + sy2) / 2, rx || 1, ry || 1, 0, 0, Math.PI * 2);
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
    const ctx    = this._worldCtx;
    const w      = WORLD_SIZE;
    const h      = WORLD_SIZE;
    const data   = ctx.getImageData(0, 0, w, h);
    const px     = data.data;
    const idx    = (x, y) => (y * w + x) * 4;
    const target = px.slice(idx(startX, startY), idx(startX, startY) + 4);

    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 1;
    const tc = tmp.getContext("2d");
    tc.fillStyle = this._color;
    tc.fillRect(0, 0, 1, 1);
    const fill = tc.getImageData(0, 0, 1, 1).data;

    const match = (i) =>
      px[i]   === target[0] && px[i + 1] === target[1] &&
      px[i + 2] === target[2] && px[i + 3] === target[3];

    if (fill[0] === target[0] && fill[1] === target[1] &&
        fill[2] === target[2]) return;

    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const i = idx(x, y);
      if (!match(i)) continue;
      px[i]     = fill[0];
      px[i + 1] = fill[1];
      px[i + 2] = fill[2];
      px[i + 3] = Math.round(fill[3] * this._opacity);
      stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    ctx.putImageData(data, 0, 0);
  }

  /* ──────────────────────────────────────────────
     History (Undo / Redo)
     ────────────────────────────────────────────── */

  _saveHistory() {
    if (!this._worldCtx) return;
    const snap = this._worldCtx.getImageData(0, 0, WORLD_SIZE, WORLD_SIZE);
    this._history.push(snap);
    if (this._history.length > MAX_HISTORY) this._history.shift();
    this._updateHistoryInfo();
  }

  _undo() {
    if (this._history.length <= 1) return;
    this._redoStack.push(this._history.pop());
    this._worldCtx.putImageData(this._history[this._history.length - 1], 0, 0);
    this._renderViewport();
    this._updateHistoryInfo();
  }

  _redo() {
    if (!this._redoStack.length) return;
    const next = this._redoStack.pop();
    this._history.push(next);
    this._worldCtx.putImageData(next, 0, 0);
    this._renderViewport();
    this._updateHistoryInfo();
  }

  _updateHistoryInfo() {
    const el = document.getElementById("fd-history-info");
    if (el) el.textContent = `Undo: ${this._history.length - 1}  Redo: ${this._redoStack.length}`;
  }

  /* ──────────────────────────────────────────────
     Export  (all from world canvas)
     ────────────────────────────────────────────── */

  async _copyToClipboard() {
    const hasClipboard = typeof navigator !== "undefined" &&
                         navigator.clipboard &&
                         typeof ClipboardItem !== "undefined" &&
                         window.isSecureContext;
    if (hasClipboard) {
      try {
        const blob = await new Promise(resolve => this._world.toBlob(resolve, "image/png"));
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        ui.notifications.info(game.i18n.localize("FOUNDRYDRAW.Actions.CopiedClipboard"));
        return;
      } catch (err) {
        console.warn(`${MODULE_ID} | clipboard write failed, falling back:`, err);
      }
    }
    const dataUrl = this._world.toDataURL("image/png");
    const win = window.open();
    if (win) {
      win.document.write(
        `<img src="${dataUrl}" style="max-width:100%;background:#888"
              title="Rechtsklick -> Bild kopieren / Right-click -> Copy Image">`
      );
      ui.notifications.info(game.i18n.localize("FOUNDRYDRAW.Actions.CopyFallback"));
    } else {
      ui.notifications.warn(game.i18n.localize("FOUNDRYDRAW.Actions.CopyFailed"));
    }
  }

  _showToPlayers() {
    if (!game.user.isGM) return;
    const src   = this._world.toDataURL("image/png");
    const title = game.i18n.localize("FOUNDRYDRAW.WindowTitle");
    new ImagePopout(src, { title, shareable: false }).render(true);
    game.socket.emit(`module.${MODULE_ID}`, { type: "showImage", src, title });
  }

  _saveImage() {
    const link    = document.createElement("a");
    link.download = `magic-circle-${Date.now()}.png`;
    link.href     = this._world.toDataURL("image/png");
    link.click();
  }

  async _saveToGallery() {
    const name = await _promptName(
      game.i18n.localize("FOUNDRYDRAW.Gallery.NameTitle"), ""
    );
    if (name === null) return;
    const trimmed = name.trim() || game.i18n.localize("FOUNDRYDRAW.Gallery.Unnamed");

    // Save at full world resolution so that loading back is lossless.
    // PNG compression keeps the file small (magic circles on parchment compress well).
    const dataUrl = this._world.toDataURL("image/png");

    const gallery = game.settings.get(MODULE_ID, "gallery");
    gallery.push({ id: foundry.utils.randomID(), name: trimmed, dataUrl, createdAt: Date.now() });
    await game.settings.set(MODULE_ID, "gallery", gallery);
    ui.notifications.info(game.i18n.localize("FOUNDRYDRAW.Gallery.Saved"));
    if (_galleryInstance?.rendered) _galleryInstance.render();
  }

  _loadFromDataUrl(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._fillBackground();

        // Draw image centred on the world canvas with "contain" scaling
        const scale = Math.min(WORLD_SIZE / img.width, WORLD_SIZE / img.height);
        const dw    = Math.round(img.width  * scale);
        const dh    = Math.round(img.height * scale);
        this._worldCtx.drawImage(
          img,
          (WORLD_SIZE - dw) / 2,
          (WORLD_SIZE - dh) / 2,
          dw, dh
        );

        // Re-centre the viewport so the loaded image is immediately visible
        this._zoom = 1.0;
        this._centerView();

        this._circleCount      = 0;
        this._baseCircleRadius = null;
        this._redoStack        = [];
        this._history          = [];
        this._saveHistory();
        this._renderViewport();
        this._updateHistoryInfo();
        resolve();
      };
      img.src = dataUrl;
    });
  }
}

/* ──────────────────────────────────────────────
   Shared helper – name prompt dialog
   ────────────────────────────────────────────── */

function _promptName(title, defaultValue = "") {
  return new Promise((resolve) => {
    new Dialog({
      title,
      content: `<div style="margin-bottom:8px">
        <input type="text" id="fd-gallery-name" value="${defaultValue}"
               style="width:100%;box-sizing:border-box">
      </div>`,
      buttons: {
        ok: {
          icon:     '<i class="fas fa-check"></i>',
          label:    game.i18n.localize("FOUNDRYDRAW.Gallery.Confirm"),
          callback: (html) => resolve(html.find("#fd-gallery-name").val()),
        },
        cancel: {
          icon:     '<i class="fas fa-times"></i>',
          label:    game.i18n.localize("Cancel"),
          callback: () => resolve(null),
        },
      },
      default: "ok",
      render:  (html) => {
        const inp = html.find("#fd-gallery-name")[0];
        if (inp) { inp.focus(); inp.select(); }
      },
    }).render(true);
  });
}

/* ──────────────────────────────────────────────
   Gallery Application
   ────────────────────────────────────────────── */

class FoundryDrawGallery extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "foundrydraw-gallery",
      title:       game.i18n.localize("FOUNDRYDRAW.GalleryTitle"),
      template:    null,
      classes:     ["foundrydraw-gallery"],
      width:       580,
      height:      480,
      resizable:   true,
      minimizable: true,
    });
  }

  async _renderInner() {
    const i18n   = (k) => game.i18n.localize(`FOUNDRYDRAW.${k}`);
    const gallery = game.settings.get(MODULE_ID, "gallery");

    let items = "";
    if (gallery.length === 0) {
      items = `<p class="fd-gallery-empty">${i18n("Gallery.Empty")}</p>`;
    } else {
      for (const entry of gallery) {
        const gmBtn = game.user.isGM
          ? `<button class="fd-gallery-btn fd-gallery-show" data-id="${entry.id}"
                     title="${i18n("Gallery.Show")}"><i class="fas fa-eye"></i></button>`
          : "";
        items += `
          <div class="fd-gallery-item" data-id="${entry.id}">
            <img class="fd-gallery-thumb" src="${entry.dataUrl}" alt="${entry.name}">
            <div class="fd-gallery-name">${entry.name}</div>
            <div class="fd-gallery-actions">
              <button class="fd-gallery-btn fd-gallery-edit" data-id="${entry.id}"
                      title="${i18n("Gallery.Edit")}"><i class="fas fa-pencil-alt"></i></button>
              <button class="fd-gallery-btn fd-gallery-rename" data-id="${entry.id}"
                      title="${i18n("Gallery.Rename")}"><i class="fas fa-i-cursor"></i></button>
              ${gmBtn}
              <button class="fd-gallery-btn fd-gallery-delete" data-id="${entry.id}"
                      title="${i18n("Gallery.Delete")}"><i class="fas fa-trash"></i></button>
            </div>
          </div>`;
      }
    }

    return $(`<div class="fd-gallery-grid">${items}</div>`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".fd-gallery-edit").on("click",   (e) => this._editEntry(e.currentTarget.dataset.id));
    html.find(".fd-gallery-rename").on("click", (e) => this._renameEntry(e.currentTarget.dataset.id));
    html.find(".fd-gallery-show").on("click",   (e) => this._showEntry(e.currentTarget.dataset.id));
    html.find(".fd-gallery-delete").on("click", (e) => this._deleteEntry(e.currentTarget.dataset.id));
  }

  _editEntry(id) {
    const gallery = game.settings.get(MODULE_ID, "gallery");
    const entry   = gallery.find(e => e.id === id);
    if (!entry) return;
    openDrawApp();
    const tryLoad = (n) => {
      const app = _appInstance;
      if (app?._canvas && app?._worldCtx) {
        app._loadFromDataUrl(entry.dataUrl);
      } else if (n < 40) {
        setTimeout(() => tryLoad(n + 1), 100);
      }
    };
    tryLoad(0);
  }

  async _renameEntry(id) {
    const gallery = game.settings.get(MODULE_ID, "gallery");
    const idx     = gallery.findIndex(e => e.id === id);
    if (idx < 0) return;
    const newName = await _promptName(
      game.i18n.localize("FOUNDRYDRAW.Gallery.RenameTitle"),
      gallery[idx].name
    );
    if (!newName?.trim()) return;
    gallery[idx].name = newName.trim();
    await game.settings.set(MODULE_ID, "gallery", gallery);
    this.render();
  }

  _showEntry(id) {
    if (!game.user.isGM) return;
    const gallery = game.settings.get(MODULE_ID, "gallery");
    const entry   = gallery.find(e => e.id === id);
    if (!entry) return;
    new ImagePopout(entry.dataUrl, { title: entry.name, shareable: false }).render(true);
    game.socket.emit(`module.${MODULE_ID}`, { type: "showImage", src: entry.dataUrl, title: entry.name });
  }

  async _deleteEntry(id) {
    const gallery  = game.settings.get(MODULE_ID, "gallery");
    const filtered = gallery.filter(e => e.id !== id);
    await game.settings.set(MODULE_ID, "gallery", filtered);
    this.render();
  }
}

/* ──────────────────────────────────────────────
   Singleton + scene control buttons
   ────────────────────────────────────────────── */

let _appInstance     = null;
let _galleryInstance = null;

function openDrawApp() {
  if (!_appInstance || !_appInstance.rendered) {
    _appInstance = new FoundryDrawApp();
    _appInstance.render(true);
  } else {
    if (_appInstance._minimized) _appInstance.maximize();
    _appInstance.bringToTop();
  }
}

function openGallery() {
  if (!_galleryInstance || !_galleryInstance.rendered) {
    _galleryInstance = new FoundryDrawGallery();
    _galleryInstance.render(true);
  } else {
    if (_galleryInstance._minimized) _galleryInstance.maximize();
    _galleryInstance.bringToTop();
  }
}

/* ──────────────────────────────────────────────
   Socket – show image to all players
   ────────────────────────────────────────────── */

Hooks.once("ready", () => {
  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (data.type !== "showImage") return;
    new ImagePopout(data.src, {
      title:     data.title ?? game.i18n.localize("FOUNDRYDRAW.WindowTitle"),
      shareable: false,
    }).render(true);
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  const group = controls.tokens ?? Object.values(controls)[0];
  if (!group?.tools) return;

  const baseOrder = (Object.keys(group.tools).length + 1) * 10;

  group.tools.foundrydraw = {
    name:     "foundrydraw",
    title:    game.i18n.localize("FOUNDRYDRAW.ButtonTitle"),
    icon:     "fas fa-magic",
    button:   true,
    visible:  true,
    order:    baseOrder,
    onChange: () => openDrawApp(),
  };

  group.tools.foundrydrawgallery = {
    name:     "foundrydrawgallery",
    title:    game.i18n.localize("FOUNDRYDRAW.GalleryTitle"),
    icon:     "fas fa-images",
    button:   true,
    visible:  true,
    order:    baseOrder + 10,
    onChange: () => openGallery(),
  };
});
