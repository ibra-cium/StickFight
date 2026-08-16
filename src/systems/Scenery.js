// Procedural Hand-Drawn Notebook Scenery (Trees, Clouds, Fences, Grass Tufts)

import { renderer } from '../graphics/NotebookRenderer.js';

export class ScenerySystem {
  constructor() {
    this.groundY = 120;
    this.clouds = [
      { x: -500, y: -240, scale: 1.1, speed: 8 },
      { x: -180, y: -290, scale: 0.8, speed: 6 },
      { x: 120, y: -220, scale: 1.3, speed: 10 },
      { x: 450, y: -270, scale: 0.9, speed: 7 },
    ];

    this.trees = [
      { x: -480, height: 160, width: 90, seed: 12 },
      { x: -280, height: 130, width: 70, seed: 44 },
      { x: 320, height: 140, width: 80, seed: 78 },
      { x: 520, height: 175, width: 95, seed: 93 },
    ];

    this.fences = [
      { x: -390, posts: 4, spacing: 24, seed: 21 },
      { x: 200, posts: 5, spacing: 22, seed: 55 },
    ];

    this.grassTufts = [];
    for (let x = -800; x <= 800; x += 35 + Math.random() * 30) {
      this.grassTufts.push({
        x,
        blades: 3 + Math.floor(Math.random() * 3),
        height: 10 + Math.random() * 12,
        seed: Math.random() * 100,
      });
    }

    // Static Scenery Offscreen Layer
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.sceneryMinX = -900;
    this.sceneryMinY = -300;
    this.sceneryWidth = 1800;
    this.sceneryHeight = 480;
    this.needsStaticRebuild = true;

    this.rebuildStaticScenery();
  }

  onResize() {
    this.rebuildStaticScenery();
  }

  rebuildStaticScenery() {
    this.staticCanvas.width = this.sceneryWidth;
    this.staticCanvas.height = this.sceneryHeight;
    const ctx = this.staticCtx;
    ctx.clearRect(0, 0, this.sceneryWidth, this.sceneryHeight);

    ctx.save();
    ctx.translate(-this.sceneryMinX, -this.sceneryMinY);

    // 1. Draw Distant Doodle Mountains
    renderer.sketchPoly(ctx, [
      { x: -800, y: this.groundY },
      { x: -500, y: this.groundY - 120 },
      { x: -280, y: this.groundY - 60 },
      { x: -80, y: this.groundY - 140 },
      { x: 160, y: this.groundY - 70 },
      { x: 420, y: this.groundY - 150 },
      { x: 680, y: this.groundY - 90 },
      { x: 800, y: this.groundY },
    ], {
      color: 'rgba(100, 110, 130, 0.4)',
      width: 1.4,
      roughness: 2.0,
      close: false,
      seed: 88,
    });

    // 2. Draw Fences & Trees
    for (const f of this.fences) this.drawFence(ctx, f);
    for (const t of this.trees) this.drawTree(ctx, t);

    // 3. Draw Main Ground Line
    renderer.sketchLine(ctx, -850, this.groundY, 850, this.groundY, {
      color: '#151515',
      width: 3.2,
      roughness: 1.4,
      passes: 3,
      seed: 42,
    });

    // Secondary ground scratch underneath
    renderer.sketchLine(ctx, -850, this.groundY + 4, 850, this.groundY + 4, {
      color: '#333333',
      width: 1.6,
      roughness: 1.0,
      passes: 1,
      seed: 99,
    });

    // 4. Draw Grass Tufts
    for (const g of this.grassTufts) {
      for (let b = 0; b < g.blades; b++) {
        const bx = g.x + (b - 1) * 4;
        const lean = (b - 1) * 5 + (Math.sin(g.seed + b) * 3);
        renderer.sketchLine(ctx, bx, this.groundY, bx + lean, this.groundY - g.height, {
          color: '#1a2e1c',
          width: 1.3,
          roughness: 0.8,
          seed: g.seed + b * 10,
        });
      }
    }

    ctx.restore();
    this.needsStaticRebuild = false;
  }

  update(dt = 1 / 60) {
    // Move clouds slowly
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 800) {
        c.x = -800;
        c.y = -220 - Math.random() * 80;
      }
    }
  }

  drawCloud(ctx, x, y, scale = 1.0, seed = 0) {
    ctx.save();
    const r = 22 * scale;
    const pts = [
      { x: x - 25 * scale, y: y },
      { x: x - 12 * scale, y: y - 18 * scale },
      { x: x + 12 * scale, y: y - 20 * scale },
      { x: x + 28 * scale, y: y - 2 * scale },
      { x: x + 20 * scale, y: y + 14 * scale },
      { x: x - 18 * scale, y: y + 14 * scale },
    ];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      renderer.sketchCircle(ctx, p.x, p.y, r * (0.8 + (i % 2) * 0.3), {
        color: '#444',
        fill: 'rgba(255, 255, 255, 0.4)',
        width: 1.4,
        roughness: 1.2,
        seed: seed + i * 15,
      });
    }

    // Flat bottom doodle line
    renderer.sketchLine(ctx, x - 35 * scale, y + 14 * scale, x + 35 * scale, y + 14 * scale, {
      color: '#444',
      width: 1.6,
      roughness: 1.0,
      seed: seed + 99,
    });
    ctx.restore();
  }

  drawTree(ctx, tree) {
    const { x, height, width, seed } = tree;
    const trunkW = 16;
    const trunkH = height * 0.45;
    const crownY = this.groundY - height + trunkH * 0.3;

    // 1. Sketched Trunk
    const trunkPts = [
      { x: x - trunkW / 2, y: this.groundY },
      { x: x - trunkW / 3, y: this.groundY - trunkH },
      { x: x + trunkW / 3, y: this.groundY - trunkH },
      { x: x + trunkW / 2, y: this.groundY },
    ];
    renderer.sketchPoly(ctx, trunkPts, {
      color: '#2a221b',
      fill: 'rgba(90, 70, 50, 0.1)',
      width: 1.8,
      seed,
    });

    // Trunk wood texture lines
    renderer.sketchLine(ctx, x - 2, this.groundY - 5, x - 1, this.groundY - trunkH + 8, {
      color: '#4a3d32',
      width: 1.2,
      seed: seed + 5,
    });

    // 2. Sketched Foliage Crown (lobed cloud shape)
    const lobes = 6;
    for (let i = 0; i < lobes; i++) {
      const angle = (i / lobes) * Math.PI * 2;
      const lx = x + Math.cos(angle) * (width * 0.45);
      const ly = crownY + Math.sin(angle) * (height * 0.28);
      const lr = (width * 0.35) + (i % 2) * 8;

      renderer.sketchCircle(ctx, lx, ly, lr, {
        color: '#1e3320',
        fill: 'rgba(80, 130, 90, 0.08)',
        width: 1.6,
        roughness: 1.5,
        seed: seed + i * 20,
      });
    }

    // Crosshatch shading inside tree crown
    renderer.sketchHatch(ctx, x - width * 0.45, crownY - height * 0.3, width * 0.9, height * 0.6, 35, 12, 'rgba(40, 70, 50, 0.35)');
  }

  drawFence(ctx, fence) {
    const { x, posts, spacing, seed } = fence;
    const postH = 34;

    // Horizontal rails
    const railY1 = this.groundY - postH * 0.75;
    const railY2 = this.groundY - postH * 0.35;
    const totalW = (posts - 1) * spacing;

    renderer.sketchLine(ctx, x - 5, railY1, x + totalW + 5, railY1, { color: '#333', width: 1.6, seed });
    renderer.sketchLine(ctx, x - 5, railY2, x + totalW + 5, railY2, { color: '#333', width: 1.6, seed: seed + 10 });

    // Vertical pickets
    for (let i = 0; i < posts; i++) {
      const px = x + i * spacing;
      const py = this.groundY - postH;
      const pts = [
        { x: px - 4, y: this.groundY },
        { x: px - 4, y: py + 6 },
        { x: px, y: py }, // pointed tip
        { x: px + 4, y: py + 6 },
        { x: px + 4, y: this.groundY },
      ];
      renderer.sketchPoly(ctx, pts, {
        color: '#2a221b',
        fill: 'rgba(240, 235, 220, 0.5)',
        width: 1.5,
        seed: seed + i * 15,
      });
    }
  }

  draw(ctx) {
    // 1. Draw Clouds (dynamic)
    for (const c of this.clouds) {
      this.drawCloud(ctx, c.x, c.y, c.scale, c.x);
    }

    // 2. Draw Pre-rendered Static Scenery (Doodle Mountains, Fences, Trees, Ground Line, Grass)
    if (this.needsStaticRebuild) {
      this.rebuildStaticScenery();
    }
    ctx.drawImage(this.staticCanvas, this.sceneryMinX, this.sceneryMinY);
  }
}

export const scenery = new ScenerySystem();
