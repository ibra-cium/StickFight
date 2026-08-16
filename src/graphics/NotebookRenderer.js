// Hand-Drawn Notebook Rendering Engine with Procedural "Line Boiling" & Graphite Style

export class NotebookRenderer {
  constructor() {
    this.frameCounter = 0;
    this.boilIndex = 0;
    this.lastBoilTime = 0;
    this.boilRate = 1000 / 12; // 12 FPS line jitter for authentic flipbook feel
    this.paperNoiseCanvas = null;

    this.createPaperTexture();
  }

  createPaperTexture() {
    // Generate subtle procedural fiber/grain texture offline
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const imgData = ctx.createImageData(256, 256);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = 245 + Math.floor(Math.random() * 10);
      data[i] = val;     // R
      data[i + 1] = val - 4; // G
      data[i + 2] = val - 14; // B (warm cream tone)
      data[i + 3] = Math.random() < 0.15 ? 18 : 6; // grain alpha
    }
    ctx.putImageData(imgData, 0, 0);
    this.paperNoiseCanvas = c;
  }

  update(timestamp = performance.now()) {
    if (timestamp - this.lastBoilTime > this.boilRate) {
      this.lastBoilTime = timestamp;
      this.boilIndex = (this.boilIndex + 1) % 8;
    }
    this.frameCounter++;
  }

  // Deterministic fast pseudo-random offset based on boilIndex & seed
  getJitter(seed = 0, scale = 1.5) {
    const s = Math.sin(seed * 91.345 + this.boilIndex * 43.123);
    const c = Math.cos(seed * 54.123 + this.boilIndex * 67.456);
    return {
      x: s * scale,
      y: c * scale,
      w: 1 + Math.abs(s) * 0.5,
    };
  }

  // Draw full ruled notebook page
  drawPaperBackground(ctx, width, height, camera, lightning = 0) {
    ctx.save();

    // Base paper tone
    if (lightning > 0.05) {
      // Lightning flash makes paper bright white
      const flash = Math.min(1, lightning);
      ctx.fillStyle = `rgb(${Math.floor(251 + 4 * flash)}, ${Math.floor(248 + 7 * flash)}, ${Math.floor(235 + 20 * flash)})`;
    } else {
      ctx.fillStyle = '#fbf7eb';
    }
    ctx.fillRect(0, 0, width, height);

    // Apply paper texture
    if (this.paperNoiseCanvas) {
      ctx.globalAlpha = 0.65;
      const ptrn = ctx.createPattern(this.paperNoiseCanvas, 'repeat');
      ctx.fillStyle = ptrn;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }

    // Ruled horizontal blue lines
    const lineSpacing = 32;
    const scrollOffsetY = (camera ? (camera.y * camera.zoom) % lineSpacing : 0);

    ctx.strokeStyle = 'rgba(70, 120, 200, 0.28)';
    ctx.lineWidth = 1.2;

    for (let y = -lineSpacing + scrollOffsetY; y < height + lineSpacing; y += lineSpacing) {
      ctx.beginPath();
      // Slight wavy hand-drawn blue lines
      const jitter = Math.sin(y * 0.1 + this.boilIndex) * 0.4;
      ctx.moveTo(0, y + jitter);
      ctx.lineTo(width, y + jitter);
      ctx.stroke();
    }

    // Vertical red margin line (notebook classic)
    const marginX = 80;
    ctx.strokeStyle = 'rgba(215, 60, 60, 0.4)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const marginJitter = Math.cos(this.boilIndex * 1.5) * 0.6;
    ctx.moveTo(marginX + marginJitter, 0);
    ctx.lineTo(marginX + marginJitter, height);
    ctx.stroke();

    // Subtle paper edge vignette / binder holes
    ctx.fillStyle = 'rgba(40, 35, 30, 0.05)';
    ctx.fillRect(0, 0, width, 8);
    ctx.fillRect(0, height - 8, width, 8);

    ctx.restore();
  }

  // Draw a rough, multi-pass hand-sketched line
  sketchLine(ctx, x1, y1, x2, y2, options = {}) {
    const {
      color = '#1a1a1a',
      width = 2.4,
      roughness = 1.5,
      passes = 2,
      seed = 0,
      alpha = 0.95
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.floor(dist / 20));

    for (let p = 0; p < passes; p++) {
      const passSeed = seed + p * 17.5 + this.boilIndex * 7.1;
      const jit1 = this.getJitter(passSeed, roughness);
      const jit2 = this.getJitter(passSeed + 3.3, roughness);

      ctx.lineWidth = Math.max(1, width * (0.85 + (p === 0 ? 0.2 : -0.1) * jit1.w));
      ctx.beginPath();
      ctx.moveTo(x1 + jit1.x * 0.5, y1 + jit1.y * 0.5);

      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const subSeed = passSeed + s * 13.7;
        const subJit = this.getJitter(subSeed, roughness);
        const mx = x1 + dx * t + subJit.x;
        const my = y1 + dy * t + subJit.y;
        ctx.lineTo(mx, my);
      }

      ctx.lineTo(x2 + jit2.x * 0.5, y2 + jit2.y * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Sketched hand-drawn circle with overlap tails
  sketchCircle(ctx, cx, cy, radius, options = {}) {
    const {
      color = '#181818',
      fill = null,
      width = 2.2,
      roughness = 1.4,
      seed = 0,
      alpha = 0.95
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = fill || 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;

    const points = [];
    const segments = 12;
    // Real hand-drawn circles overlap at the start/end
    const totalAngle = Math.PI * 2 + 0.35;

    for (let i = 0; i <= segments + 2; i++) {
      const angle = (i / segments) * Math.PI * 2;
      if (angle > totalAngle) break;
      const s = seed + i * 8.9 + this.boilIndex * 5.3;
      const rOffset = (Math.sin(s) * 0.7 + Math.cos(s * 1.7) * 0.5) * roughness;
      const r = radius + rOffset;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < segments; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Outline passes
    for (let p = 0; p < 2; p++) {
      const pOffset = (p === 0 ? 0 : 0.8);
      ctx.lineWidth = Math.max(1, width + (p === 0 ? 0.3 : -0.3));
      ctx.beginPath();
      ctx.moveTo(points[0].x + pOffset, points[0].y + pOffset);

      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // Sketched Polygon (swords, shields, UI boxes)
  sketchPoly(ctx, points, options = {}) {
    if (points.length < 2) return;
    const {
      color = '#181818',
      fill = null,
      width = 2.2,
      roughness = 1.3,
      seed = 0,
      close = true,
      alpha = 0.95
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = fill || 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (close) ctx.closePath();
      ctx.fill();
    }

    // Outline edges
    for (let i = 0; i < points.length; i++) {
      if (i === points.length - 1 && !close) break;
      const nextIdx = (i + 1) % points.length;
      this.sketchLine(ctx, points[i].x, points[i].y, points[nextIdx].x, points[nextIdx].y, {
        color,
        width,
        roughness,
        seed: seed + i * 23.1,
        passes: 2,
      });
    }

    ctx.restore();
  }

  // Crosshatch / pencil shading for bars & bodies
  sketchHatch(ctx, x, y, w, h, angle = 45, step = 8, color = '#222') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.7;

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const length = Math.hypot(w, h) * 1.5;
    for (let d = -length; d < length; d += step) {
      const jit = Math.sin(d + this.boilIndex) * 0.8;
      const x1 = x + w / 2 + cos * d - sin * length + jit;
      const y1 = y + h / 2 + sin * d + cos * length + jit;
      const x2 = x + w / 2 + cos * d + sin * length + jit;
      const y2 = y + h / 2 + sin * d - cos * length + jit;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Sketched Box with hand-drawn corner loops/imperfections
  sketchBox(ctx, x, y, w, h, options = {}) {
    const { fill = null, color = '#1a1a1a', width = 2.2, seed = 0 } = options;
    const pts = [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h },
      { x: x, y: y + h }
    ];
    this.sketchPoly(ctx, pts, { fill, color, width, seed, close: true });
  }

  // Sketched text helper (adds slight rough bounce)
  sketchText(ctx, text, x, y, options = {}) {
    const {
      font = "24px 'Permanent Marker', cursive",
      color = '#181818',
      align = 'center',
      baseline = 'middle',
      seed = 0
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    const jit = this.getJitter(seed, 0.8);
    ctx.fillText(text, x + jit.x * 0.5, y + jit.y * 0.5);
    ctx.restore();
  }
}

export const renderer = new NotebookRenderer();
