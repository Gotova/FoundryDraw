/**
 * FoundryDraw - Magic Circle Painter
 * A drawing canvas for painting magic circles in Foundry VTT v13.
 */

const MODULE_ID = "foundrydraw";

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
    this._brushSize  = 8;
    this._opacity    = 1.0;
    this._symmetry   = 1;
    this._keyHandler = null;
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
    <input type="range" id="fd-brush-size" min="1" max="80" value="${this._brushSize}">
    <span class="fd-val" id="fd-brush-size-val">${this._brushSize}</span>
  </div>

  <div class="fd-slider-group">
    <label>${i18n("Settings.Opacity")}</label>
    <input type="range" id="fd-opacity" min="1" max="100" value="${Math.round(this._opacity * 100)}">
    <span class="fd-val" id="fd-opacity-val">${Math.round(this._opacity * 100)}%</span>
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

  <button class="fd-tool-btn" id="fd-undo"      data-tooltip="${i18n("Actions.Undo")}">
    <i class="fas fa-undo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-redo"      data-tooltip="${i18n("Actions.Redo")}">
    <i class="fas fa-redo"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clear"     data-tooltip="${i18n("Actions.Clear")}">
    <i class="fas fa-trash"></i>
  </button>
  <button class="fd-tool-btn" id="fd-clipboard" data-tooltip="${i18n("Actions.CopyClipboard")}">
    <i class="fas fa-clipboard"></i>
  </button>
  <button class="fd-tool-btn" id="fd-save"      data-tooltip="${i18n("Actions.Save")}">
    <i class="fas fa-download"></i>
  </button>

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
    // Defer so Foundry has time to apply the new inline style first
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

    // Grow the backing canvas first if the window just got larger
    this._expandBacking(w, h);

    // Resize the display canvas (this clears it)
    this._applyCanvasSize(w, h);

    // Restore from the backing canvas – never loses content
    this._ctx.drawImage(this._back, 0, 0);
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

  /* Copy the display canvas into the backing canvas at (0,0). */
  _syncToBacking() {
    if (!this._back) return;
    this._backCtx.drawImage(this._canvas, 0, 0);
  }

  /* Grow the backing canvas when the display grows larger than it has ever been. */
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

    // Fill entire new backing with parchment, then restore old content
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
    ctx.drawImage(tmp, 0, 0);
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

    html.find("#fd-opacity").on("input", (e) => {
      this._opacity = parseInt(e.currentTarget.value) / 100;
      html.find("#fd-opacity-val").text(`${Math.round(this._opacity * 100)}%`);
    });

    html.find("#fd-symmetry").on("change", (e) => {
      this._symmetry = parseInt(e.currentTarget.value);
    });

    html.find("#fd-undo").on("click", () => this._undo());
    html.find("#fd-redo").on("click", () => this._redo());

    html.find("#fd-clear").on("click", () => {
      if (!confirm(game.i18n.localize("FOUNDRYDRAW.Actions.ClearConfirm"))) return;
      this._saveHistory();
      this._redoStack = [];
      this._fillBackground();
      this._syncToBacking();
      this._updateHistoryInfo();
    });

    html.find("#fd-clipboard").on("click", () => this._copyToClipboard());
    html.find("#fd-save").on("click", () => this._saveImage());
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

    this._saveHistory();
    this._redoStack = [];

    if (this._tool === "fill") {
      this._floodFill(Math.round(p.x), Math.round(p.y));
      this._drawing = false;
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

  _saveImage() {
    const link    = document.createElement("a");
    link.download = `magic-circle-${Date.now()}.png`;
    link.href     = this._canvas.toDataURL("image/png");
    link.click();
  }
}

/* ──────────────────────────────────────────────
   Singleton + scene control button
   ────────────────────────────────────────────── */

let _appInstance = null;

function openDrawApp() {
  if (!_appInstance || !_appInstance.rendered) {
    _appInstance = new FoundryDrawApp();
  }
  _appInstance.render(true);
}

Hooks.on("getSceneControlButtons", (controls) => {
  const group = controls.tokens ?? Object.values(controls)[0];
  if (!group?.tools) return;

  group.tools.foundrydraw = {
    name:    "foundrydraw",
    title:   game.i18n.localize("FOUNDRYDRAW.ButtonTitle"),
    icon:    "fas fa-magic",
    button:  true,
    visible: true,
    order:   (Object.keys(group.tools).length + 1) * 10,
    onChange: () => openDrawApp(),
  };
});
