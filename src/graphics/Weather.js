// Procedural Hand-Drawn Weather & Rain Engine

import { renderer } from './NotebookRenderer.js?v=4';
import { particles } from './Particles.js';
import { sound } from '../core/Audio.js';

export class WeatherSystem {
  constructor() {
    this.intensity = 0; // 0 = clear, 0.3 = light, 0.7 = heavy, 1.0 = storm
    this.targetIntensity = 0;
    this.drops = [];
    this.puddles = [];
    this.maxDrops = 180;
    this.wind = -0.25; // slight diagonal wind
    this.groundY = 120; // y coordinate of ground in world space

    // Lightning & Thunder
    this.hasLightning = false;
    this.lightningFlash = 0; // 0 to 1
    this.lightningTimer = 0;
    this.lightningBolts = [];

    this.initDrops();
    this.initPuddles();
  }

  initDrops() {
    for (let i = 0; i < this.maxDrops; i++) {
      this.drops.push(this.createDrop(true));
    }
  }

  initPuddles() {
    this.puddles = [
      { x: -320, width: 70, ripplePhase: 0 },
      { x: -110, width: 110, ripplePhase: 1.2 },
      { x: 140, width: 90, ripplePhase: 2.5 },
      { x: 360, width: 80, ripplePhase: 4.1 },
    ];
  }

  createDrop(randomY = false) {
    return {
      x: (Math.random() - 0.5) * 1600,
      y: randomY ? -300 + Math.random() * 450 : -350 - Math.random() * 80,
      speed: 450 + Math.random() * 350,
      length: 14 + Math.random() * 18,
      thickness: 0.9 + Math.random() * 0.9,
      alpha: 0.35 + Math.random() * 0.45,
      seed: Math.random() * 100,
    };
  }

  setLevelWeather(levelIndex) {
    // Levels 1-3: Clear
    // Levels 4-6: Light Rain
    // Levels 7-9: Heavy Rain
    // Level 10: Thunderstorm + Lightning
    if (levelIndex <= 3) {
      this.targetIntensity = 0.0;
      this.hasLightning = false;
    } else if (levelIndex <= 6) {
      this.targetIntensity = 0.4;
      this.hasLightning = false;
    } else if (levelIndex <= 9) {
      this.targetIntensity = 0.8;
      this.hasLightning = false;
    } else {
      this.targetIntensity = 1.0;
      this.hasLightning = true;
      this.lightningTimer = 3.0 + Math.random() * 4.0;
    }
  }

  triggerLightning(camera) {
    this.lightningFlash = 1.0;
    if (camera) camera.shake(12);
    sound.playThunder();

    // Generate rough hand-drawn jagged lightning bolt
    this.lightningBolts = [];
    const numBolts = 1 + Math.floor(Math.random() * 2);

    for (let b = 0; b < numBolts; b++) {
      let curX = (Math.random() - 0.5) * 700;
      let curY = -350;
      const points = [{ x: curX, y: curY }];

      while (curY < this.groundY - 40) {
        curY += 25 + Math.random() * 40;
        curX += (Math.random() - 0.5) * 65 + this.wind * 20;
        points.push({ x: curX, y: curY });
        // Branch
        if (Math.random() < 0.35 && points.length > 2) {
          const branchX = curX + (Math.random() - 0.5) * 50;
          const branchY = curY + 20 + Math.random() * 30;
          this.lightningBolts.push({
            points: [{ x: curX, y: curY }, { x: branchX, y: branchY }],
            life: 0.25,
            width: 2.2,
          });
        }
      }

      this.lightningBolts.push({
        points,
        life: 0.35,
        width: 3.5,
      });
    }
  }

  update(dt = 1 / 60, camera = null) {
    // Smooth transition
    this.intensity += (this.targetIntensity - this.intensity) * (2.0 * dt);
    sound.setRainIntensity(this.intensity);

    if (this.intensity > 0.02) {
      const activeCount = Math.floor(this.maxDrops * this.intensity);

      for (let i = 0; i < activeCount; i++) {
        const d = this.drops[i];
        d.y += d.speed * dt;
        d.x += this.wind * d.speed * dt;

        // Ground splash check
        if (d.y >= this.groundY) {
          if (Math.random() < 0.45) {
            particles.addSplash(d.x, this.groundY);
          }
          // Reset drop
          this.drops[i] = this.createDrop(false);
        }
      }

      // Update puddle ripples
      for (const puddle of this.puddles) {
        puddle.ripplePhase += (2.5 + this.intensity * 3.0) * dt;
      }
    }

    // Lightning processing
    if (this.hasLightning && this.intensity > 0.6) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.triggerLightning(camera);
        this.lightningTimer = 4.0 + Math.random() * 5.5;
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash -= dt * 2.8;
      if (this.lightningFlash < 0) this.lightningFlash = 0;
    }

    // Update active lightning bolt graphics
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].life -= dt;
      if (this.lightningBolts[i].life <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (this.intensity < 0.02 && this.lightningBolts.length === 0) return;

    // 1. Draw Puddles and Ripples on Ground
    if (this.intensity > 0.2) {
      ctx.save();
      for (const p of this.puddles) {
        const puddleAlpha = Math.min(0.65, this.intensity * 0.7);
        ctx.globalAlpha = puddleAlpha;

        // Hand-drawn puddle ellipse
        renderer.sketchPoly(ctx, [
          { x: p.x - p.width / 2, y: this.groundY + 3 },
          { x: p.x, y: this.groundY + 7 },
          { x: p.x + p.width / 2, y: this.groundY + 3 },
          { x: p.x, y: this.groundY - 1 },
        ], {
          color: '#3a506b',
          fill: 'rgba(90, 120, 160, 0.15)',
          width: 1.5,
          roughness: 0.8,
          seed: p.x,
        });

        // Expanding ripples
        const rCount = 2;
        for (let r = 0; r < rCount; r++) {
          const rRadius = ((p.ripplePhase + r * 1.5) % 3.0) * (p.width * 0.16);
          const rAlpha = Math.max(0, 1 - (rRadius / (p.width * 0.48)));
          ctx.globalAlpha = puddleAlpha * rAlpha;
          renderer.sketchPoly(ctx, [
            { x: p.x - rRadius, y: this.groundY + 3 },
            { x: p.x, y: this.groundY + 3 + rRadius * 0.2 },
            { x: p.x + rRadius, y: this.groundY + 3 },
            { x: p.x, y: this.groundY + 3 - rRadius * 0.2 },
          ], {
            color: '#46607a',
            width: 1.1,
            roughness: 0.5,
            seed: p.x + r * 10,
          });
        }
      }
      ctx.restore();
    }

    // 2. Draw Lightning Bolts
    if (this.lightningBolts.length > 0) {
      ctx.save();
      for (const bolt of this.lightningBolts) {
        ctx.globalAlpha = Math.min(1.0, bolt.life * 4.0);
        for (let j = 0; j < bolt.points.length - 1; j++) {
          const p1 = bolt.points[j];
          const p2 = bolt.points[j + 1];
          renderer.sketchLine(ctx, p1.x, p1.y, p2.x, p2.y, {
            color: '#111',
            width: bolt.width,
            roughness: 2.0,
            passes: 2,
            seed: j * 12.3,
          });
        }
      }
      ctx.restore();
    }

    // 3. Draw Rain Streaks
    const activeCount = Math.floor(this.maxDrops * this.intensity);
    ctx.save();
    for (let i = 0; i < activeCount; i++) {
      const d = this.drops[i];
      const x2 = d.x + this.wind * d.length;
      const y2 = d.y + d.length;

      ctx.globalAlpha = d.alpha * this.intensity;
      renderer.sketchLine(ctx, d.x, d.y, x2, y2, {
        color: '#2a3540',
        width: d.thickness,
        roughness: 0.4,
        passes: 1,
        seed: d.seed,
      });
    }
    ctx.restore();
  }
}

export const weather = new WeatherSystem();
