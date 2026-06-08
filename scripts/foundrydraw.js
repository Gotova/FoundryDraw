/**
 * FoundryDraw - Magic Circle Painter
 * A drawing canvas for painting magic circles in Foundry VTT v13.
 */

const MODULE_ID = "foundrydraw";

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

    this._history    = [];
    this._redoStack  = [];
    this._drawing    = false;
    this._lastX      = 0;
    this._lastY      = 0;
    this._startX     = 0;
    this._startY     = 0;

    this._tool       = "brush";
    this._color      = "#030821";
    this._brushSize  = 4;
    this._opacity    = 1.0;
    this._symmetry   = 1;
    this._keyHandler = null;

    this._circleCount      = 0;   // how many template circles have been inserted
    this._baseCircleRadius = null; // radius of the first inserted circle
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "foundrydraw-app",
      title:       game.i18n.localize("FOUNDRYDRAW.WindowTitle"),
      template:    null,
      classes:     ["foundrydraw-app"],
      width:       820,
      height:      640,
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

  <button class="fd-tool-btn" id="fd-undo"           data-tooltip="${i18n("Actions.Undo")}">
    <i class="fas fa-undo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-redo"           data-tooltip="${i18n("Actions.Redo")}">
    <i class="fas fa-redo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-insert-circle"  data-tooltip="${i18n("Actions.InsertCircle")}">
    <i class="fas fa-circle-plus"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clear"          data-tooltip="${i18n("Actions.Clear")}">
    <i class="fas fa-trash"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clipboard"    data-tooltip="${i18n("Actions.CopyClipboard")}">
    <i class="fas fa-clipboard"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save-gallery" data-tooltip="${i18n("Actions.SaveGallery")}">
    <i class="fas fa-floppy-disk"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save"         data-tooltip="${i18n("Actions.Save")}">
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
  <span id="fd-history-info">Undo: 0</span>
</div>`;

    return $(html);
  }

  /* ── Lifecycle ── */

  activateListeners(html) {
    super.activateListeners(html);

    // Use getElementById instead of html.find() – the three root divs
    // returned by _renderInner are siblings in the jQuery collection,
    // so find() cannot locate them (it only searches descendants).
    this._canvas  = document.getElementById("foundrydraw-canvas");
    this._overlay = document.getElementById("foundrydraw-overlay");
    this._wrap    = document.getElementById("fd-canvas-wrap");

    if (!this._canvas || !this._overlay || !this._wrap) {
      console.error(`${MODULE_ID} | canvas elements not found in DOM`);
      return;
    }

    this._ctx  = this._canvas.getContext("2d");
    this._octx = this._overlay.getContext("2d");

    // Size canvas to fill the container.
    // Retry up to 20 times (every 16 ms) until the wrap has a real size –
    // flex layout may not be settled on the very first frame.
    this._initWhenReady(0);

    this._bindControls(html);
    this._bindCanvasEvents();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this._wrap);

    // Keyboard shortcuts – capture phase so Foundry's own handlers don't swallow them
    this._keyHandler = (e) => {
      if (!this.rendered) return;
      // Don't steal shortcuts when the user is typing in an input field
      const focused = document.activeElement;
      if (focused && (
        focused.tagName === "INPUT" ||
        focused.tagName === "TEXTAREA" ||
        focused.isContentEditable
      )) return;

      const isZ = e.key === "z" || e.key === "Z";
      if (e.ctrlKey && isZ && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); this._undo();  return; }
      if (e.ctrlKey && isZ &&  e.shiftKey) { e.preventDefault(); e.stopPropagation(); this._redo();  return; }
      if (e.ctrlKey && e.key === "y")       { e.preventDefault(); e.stopPropagation(); this._redo();  return; }
    };
    document.addEventListener("keydown", this._keyHandler, true);
  }

  /* Foundry calls setPosition whenever the window is dragged or resized.
     We hook it to synchronise the canvas dimensions. */
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
     Canvas Sizing
     ────────────────────────────────────────────── */

  _initWhenReady(attempts) {
    if (!this._wrap) return; // app closed before init completed
    const w = this._wrap.clientWidth;
    const h = this._wrap.clientHeight;
    if (w <= 0 || h <= 0) {
      if (attempts < 20) setTimeout(() => this._initWhenReady(attempts + 1), 16);
      return;
    }
    this._applyCanvasSize(w, h);
    this._initCanvas();
  }

  /* Set both the buffer dimensions (attributes) AND the CSS pixel size.
     These MUST match – mismatching them causes coordinate distortion. */
  _applyCanvasSize(w, h) {
    for (const c of [this._canvas, this._overlay]) {
      c.width        = w;
      c.height       = h;
      c.style.width  = w + "px";
      c.style.height = h + "px";
    }
  }

  _onResize() {
    if (!this._canvas || !this._overlay || !this._back) return;
    const w = this._wrap.clientWidth;
    const h = this._wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    if (this._canvas.width === w && this._canvas.height === h) return;

    // Grow the backing canvas first if the window just got larger than ever.
    // _expandBacking keeps existing content CENTRED in the new (larger) backing.
    this._expandBacking(w, h);

    // Resize the display canvas (this clears it)
    this._applyCanvasSize(w, h);

    // Restore from the backing canvas, centred so the drawing stays pinned
    // to the symmetry point (canvas centre) regardless of window size.
    const ox = Math.round((this._back.width  - w) / 2);
    const oy = Math.round((this._back.height - h) / 2);
    this._fillBackground();
    this._ctx.drawImage(this._back, -ox, -oy);

    // Keep the backing in sync with what is now on canvas so that any
    // subsequent resize always starts from an accurately centred state.
    // Without this, a subtle discrepancy after a gallery load causes the
    // symmetry centre to appear shifted on the very first window widening.
    this._syncToBacking();
  }

  /* ──────────────────────────────────────────────
     Canvas Initialisation
     ────────────────────────────────────────────── */

  _initCanvas() {
    // The backing canvas is the source of truth – it never shrinks.
    // When the window is made smaller we only clip the VIEW; the backing
    // retains every pixel so making the window larger again restores them.
    this._back    = document.createElement("canvas");
    this._back.width  = this._canvas.width;
    this._back.height = this._canvas.height;
    this._backCtx = this._back.getContext("2d");

    this._fillBackground();
    this._syncToBacking();
    this._saveHistory();
  }

  /* Copy the display canvas into the backing canvas, CENTRED.
     The backing may be larger than the display (it never shrinks), so we
     offset by half the size difference so that both share the same centre
     point – which is where the symmetry crosshair sits. */
  _syncToBacking() {
    if (!this._back) return;
    const ox = Math.round((this._back.width  - this._canvas.width)  / 2);
    const oy = Math.round((this._back.height - this._canvas.height) / 2);
    this._backCtx.drawImage(this._canvas, ox, oy);
  }

  /* Grow the backing canvas when the display grows larger than it has ever been.
     Old content is placed CENTRED inside the new (larger) backing so the
     drawing centre stays aligned with the symmetry point. */
  _expandBacking(w, h) {
    if (w <= this._back.width && h <= this._back.height) return;
    const newW = Math.max(this._back.width, w);
    const newH = Math.max(this._back.height, h);

    // Snapshot old backing content
    const tmp = document.createElement("canvas");
    tmp.width  = this._back.width;
    tmp.height = this._back.height;
    tmp.getContext("2d").drawImage(this._back, 0, 0);

    this._back.width  = newW;
    this._back.height = newH;

    // Fill entire new backing with parchment
    const ctx = this._backCtx;
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#e8d5a3";
    ctx.fillRect(0, 0, newW, newH);
    const vig = ctx.createRadialGradient(
      newW / 2, newH / 2, Math.min(newW, newH) * 0.25,
      newW / 2, newH / 2, Math.max(newW, newH) * 0.8
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(60,30,0,0.2)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, newW, newH);

    // Restore old content CENTRED so the drawing centre doesn't shift
    const offsetX = Math.round((newW - tmp.width)  / 2);
    const offsetY = Math.round((newH - tmp.height) / 2);
    ctx.drawImage(tmp, offsetX, offsetY);
  }

  _fillBackground() {
    const ctx = this._ctx;
    const { width, height } = this._canvas;
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";

    // Parchment base
    ctx.fillStyle = "#e8d5a3";
    ctx.fillRect(0, 0, width, height);

    // Subtle warm vignette toward the edges
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(60,30,0,0.2)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
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

    html.find("#fd-symmetry").on("change", (e) => {
      this._symmetry = parseInt(e.currentTarget.value);
    });

    html.find("#fd-undo").on("click", () => this._undo());
    html.find("#fd-redo").on("click", () => this._redo());
    html.find("#fd-insert-circle").on("click", () => this._insertCircleTemplate());

    html.find("#fd-clear").on("click", () => {
      this._redoStack = [];
      this._circleCount      = 0;
      this._baseCircleRadius = null;
      this._fillBackground();
      this._saveHistory();
      this._syncToBacking();
      this._updateHistoryInfo();
    });

    html.find("#fd-clipboard").on("click", () => this._copyToClipboard());
    html.find("#fd-save-gallery").on("click", () => this._saveToGallery());
    html.find("#fd-save").on("click", () => this._saveImage());
    if (game.user.isGM) {
      html.find("#fd-show-players").on("click", () => this._showToPlayers());
    }
  }

  /* ──────────────────────────────────────────────
     Canvas Event Handling
     ────────────────────────────────────────────── */

  _bindCanvasEvents() {
    const el = this._canvas;
    el.addEventListener("pointerdown",  (e) => this._onPointerDown(e));
    el.addEventListener("pointermove",  (e) => this._onPointerMove(e));
    el.addEventListener("pointerup",    (e) => this._onPointerUp(e));
    el.addEventListener("pointerleave", (e) => { if (this._drawing) this._onPointerUp(e); });
    el.addEventListener("mousemove",    (e) => this._updateCoords(e));
  }

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
    const p  = this._canvasPoint(e);
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

    this._redoStack = [];

    if (this._tool === "fill") {
      this._floodFill(Math.round(p.x), Math.round(p.y));
      this._drawing = false;
      this._saveHistory();
      this._syncToBacking();
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
    this._saveHistory();
    this._syncToBacking();
    this._updateHistoryInfo();
  }

  /* ──────────────────────────────────────────────
     Drawing Primitives
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
      const dx         = x2 - cx, dy = y2 - cy;
      const origAngle  = Math.atan2(ty1 - cy, tx1 - cx);
      const newAngle   = Math.atan2(dy, dx) + (origAngle - Math.atan2(y1 - cy, x1 - cx));
      const r2         = Math.hypot(dx, dy);
      const tx2        = cx + r2 * Math.cos(newAngle);
      const ty2        = cy + r2 * Math.sin(newAngle);

      const ctx = this._ctx;
      this._applyBrushStyle(ctx, this._tool === "eraser");
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    });
  }

  _withSymmetry(x, y, fn) {
    const cx        = this._canvas.width  / 2;
    const cy        = this._canvas.height / 2;
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
    const spacing = 50; // px between consecutive circles

    if (this._circleCount === 0) {
      // First circle: derive base radius from current canvas proportions
      this._baseCircleRadius = Math.round(
        Math.min(this._canvas.width, this._canvas.height) / 2 * 0.85
      );
    } else {
      // Outer circle: grow canvas height first so the ring has room
      const newH = this._wrap.clientHeight + 100;
      this._wrap.style.height = `${newH}px`;
      this._onResize(); // recentres existing content in the larger canvas
    }

    // Read dimensions AFTER potential resize so cx/cy are up-to-date
    const cx = this._canvas.width  / 2;
    const cy = this._canvas.height / 2;
    const r  = this._baseCircleRadius + this._circleCount * spacing;

    this._redoStack = [];

    const ctx = this._ctx;
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
    this._syncToBacking();
    this._updateHistoryInfo();
  }

  _drawShape(ctx, x1, y1, x2, y2) {
    const isOverlay = ctx === this._octx;
    if (!isOverlay) {
      this._applyBrushStyle(ctx, false);
    } else {
      ctx.globalAlpha = this._opacity;
      ctx.strokeStyle = this._color;
      ctx.lineWidth   = this._brushSize;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }

    const cx   = this._canvas.width  / 2;
    const cy   = this._canvas.height / 2;
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
    const ctx    = this._ctx;
    const w      = this._canvas.width;
    const h      = this._canvas.height;
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
      px[i] === target[0] && px[i+1] === target[1] &&
      px[i+2] === target[2] && px[i+3] === target[3];

    if (fill[0] === target[0] && fill[1] === target[1] &&
        fill[2] === target[2]) return;

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
    this._redoStack.push(this._history.pop());
    this._ctx.putImageData(this._history[this._history.length - 1], 0, 0);
    this._syncToBacking();
    this._updateHistoryInfo();
  }

  _redo() {
    if (!this._redoStack.length) return;
    const next = this._redoStack.pop();
    this._history.push(next);
    this._ctx.putImageData(next, 0, 0);
    this._syncToBacking();
    this._updateHistoryInfo();
  }

  _updateHistoryInfo() {
    const el = document.getElementById("fd-history-info");
    if (el) el.textContent = `Undo: ${this._history.length - 1}  Redo: ${this._redoStack.length}`;
  }

  /* ──────────────────────────────────────────────
     Export
     ────────────────────────────────────────────── */

  async _copyToClipboard() {
    // The Clipboard API requires a secure context (HTTPS or localhost with flag).
    // Foundry often runs on plain HTTP, so we fall back to opening the image
    // in a new tab where the user can right-click → Copy Image.
    const hasClipboard = typeof navigator !== "undefined" &&
                         navigator.clipboard &&
                         typeof ClipboardItem !== "undefined" &&
                         window.isSecureContext;

    if (hasClipboard) {
      try {
        const blob = await new Promise(resolve => this._canvas.toBlob(resolve, "image/png"));
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        ui.notifications.info(game.i18n.localize("FOUNDRYDRAW.Actions.CopiedClipboard"));
        return;
      } catch (err) {
        console.warn(`${MODULE_ID} | clipboard write failed, falling back:`, err);
      }
    }

    // Fallback: open image in new tab so the user can right-click → Copy Image
    const dataUrl = this._canvas.toDataURL("image/png");
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
    const src   = this._canvas.toDataURL("image/png");
    const title = game.i18n.localize("FOUNDRYDRAW.WindowTitle");
    // Show to GM immediately
    new ImagePopout(src, { title, shareable: false }).render(true);
    // Broadcast to all players (they receive it via the socket handler)
    game.socket.emit(`module.${MODULE_ID}`, { type: "showImage", src, title });
  }

  _saveImage() {
    const link    = document.createElement("a");
    link.download = `magic-circle-${Date.now()}.png`;
    link.href     = this._canvas.toDataURL("image/png");
    link.click();
  }

  async _saveToGallery() {
    const name = await _promptName(
      game.i18n.localize("FOUNDRYDRAW.Gallery.NameTitle"), ""
    );
    if (name === null) return;
    const trimmed = name.trim() || game.i18n.localize("FOUNDRYDRAW.Gallery.Unnamed");
    const dataUrl = this._canvas.toDataURL("image/png");
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
        // Resize the wrap height proportionally so the image fits without padding.
        // wrapW is read before the style change to keep the calculation consistent.
        const wrapW   = this._wrap.clientWidth;
        const targetH = Math.max(Math.round(img.height * wrapW / img.width), 600);

        // Update the wrap height and size the canvas directly.
        // We deliberately do NOT call _onResize() here because that would try
        // to restore old backing content (via _expandBacking + drawImage(back,...))
        // before we have drawn the new image — corrupting the centering state.
        this._wrap.style.height = `${targetH}px`;
        this._applyCanvasSize(wrapW, targetH);

        const cw    = this._canvas.width;   // === wrapW
        const ch    = this._canvas.height;  // === targetH
        this._fillBackground();

        // Draw the image proportionally ("contain") so aspect-ratio is always
        // preserved regardless of minor canvas/wrap dimension differences.
        const scale = Math.min(cw / img.width, ch / img.height);
        const dw    = Math.round(img.width  * scale);
        const dh    = Math.round(img.height * scale);
        this._ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);

        // Reset the backing to exactly the current canvas size so there are
        // no stale pixels that could reappear when the window is made wider.
        this._back.width  = cw;
        this._back.height = ch;
        // this._backCtx remains valid after a canvas-dimension reset.

        this._circleCount      = 0;
        this._baseCircleRadius = null;
        this._redoStack        = [];
        this._history          = [];   // discard all pre-load history entries
        this._saveHistory();
        this._syncToBacking();  // ox = oy = 0 now → fills entire backing cleanly
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
    // Poll until the draw-pad canvas is initialised, then load the image
    const tryLoad = (n) => {
      const app = _appInstance;
      if (app?._canvas && app?._ctx && app?._back) {
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
   Singleton + scene control button
   ────────────────────────────────────────────── */

let _appInstance     = null;
let _galleryInstance = null;

function openDrawApp() {
  if (!_appInstance || !_appInstance.rendered) {
    _appInstance = new FoundryDrawApp();
    _appInstance.render(true);
  } else {
    // App is already rendered – bring it to front without re-rendering.
    // A force-render (render(true)) would destroy all DOM elements, re-run
    // activateListeners, and reset the backing canvas via _initCanvas(),
    // wiping out any content the user has drawn or loaded from gallery.
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
    name:    "foundrydraw",
    title:   game.i18n.localize("FOUNDRYDRAW.ButtonTitle"),
    icon:    "fas fa-magic",
    button:  true,
    visible: true,
    order:   baseOrder,
    onChange: () => openDrawApp(),
  };

  group.tools.foundrydrawgallery = {
    name:    "foundrydrawgallery",
    title:   game.i18n.localize("FOUNDRYDRAW.GalleryTitle"),
    icon:    "fas fa-images",
    button:  true,
    visible: true,
    order:   baseOrder + 10,
    onChange: () => openGallery(),
  };
});
