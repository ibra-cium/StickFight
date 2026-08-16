// Procedural Hand-Drawn Particle System for Notebook Duel

import { renderer } from './NotebookRenderer.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.slashTrails = [];
    this.damageTexts = [];
  }

  reset() {
    this.particles = [];
    this.slashTrails = [];
    this.damageTexts = [];
  }

  // Add impact spark burst (pencil stars, ink flecks)
  addSparkBurst(x, y, count = 8, color = '#1a1a1a') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        length: 6 + Math.random() * 12,
        life: 1.0,
        decay: 3.5 + Math.random() * 2.0,
        color,
        seed: Math.random() * 100,
      });
    }

    // Add 1-2 impact cross/star doodles
    this.particles.push({
      type: 'impact_star',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 14 + Math.random() * 10,
      life: 1.0,
      decay: 6.0, // fast pop
      color,
      seed: Math.random() * 100,
    });
  }

  // Add perfect parry shockwave/ink spark burst & large PARRY! popup (0.6s duration)
  addParryEffect(x, y) {
    // 1. Burst of ink sparks and dark flecks
    const sparkCount = 20;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 200 + Math.random() * 220;
      const inkColors = ['#0d47a1', '#1a237e', '#01579b', '#111111', '#0d47a1'];
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 14 + Math.random() * 16,
        life: 1.0,
        decay: 2.8,
        color: inkColors[i % inkColors.length],
        seed: Math.random() * 100,
      });
    }

    // Impact star doodles
    for (let s = 0; s < 2; s++) {
      this.particles.push({
        type: 'impact_star',
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        size: 20 + Math.random() * 10,
        life: 1.0,
        decay: 4.5,
        color: '#0d47a1',
        seed: Math.random() * 100,
      });
    }

    // Large hand-drawn "PARRY!" popup in Permanent Marker for 0.6s
    this.damageTexts.push({
      text: 'PARRY!',
      x,
      y: y - 28,
      vy: -55,
      life: 1.0,
      decay: 1.0 / 0.6, // Exactly 0.6s duration
      color: '#0d47a1',
      scale: 1.7, // Large prominent text
    });
  }

  // Guard break particle burst and popup
  addGuardBreakEffect(x, y) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 200;
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 12 + Math.random() * 14,
        life: 1.0,
        decay: 2.5,
        color: '#c62828',
        seed: Math.random() * 100,
      });
    }

    this.damageTexts.push({
      text: 'GUARD BREAK!',
      x,
      y: y - 35,
      vy: -45,
      life: 1.0,
      decay: 1.0 / 0.9, // 0.9s duration
      color: '#c62828',
      scale: 1.4,
    });
  }

  // Add sword slash trail arc (curved pencil swoosh)
  addSlashTrail(points, color = '#1a1a1a', width = 3) {
    if (points.length < 2) return;
    this.slashTrails.push({
      points: points.map(p => ({ x: p.x, y: p.y })),
      life: 1.0,
      decay: 5.5,
      color,
      width,
      seed: Math.random() * 100,
    });
  }

  // Ground dust puff when dashing/landing
  addDust(x, y, direction = 1) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 4,
        vx: -direction * (20 + Math.random() * 40),
        vy: -15 - Math.random() * 20,
        radius: 3 + Math.random() * 4,
        life: 1.0,
        decay: 2.5,
        color: 'rgba(50, 45, 40, 0.6)',
        seed: Math.random() * 100,
      });
    }
  }

  // Sketched damage number / text popup
  addDamageText(text, x, y, color = '#b71c1c') {
    this.damageTexts.push({
      text: String(text),
      x: x + (Math.random() - 0.5) * 15,
      y: y - 10,
      vy: -50 - Math.random() * 30,
      life: 1.0,
      decay: 1.6,
      color,
      scale: 1.0,
    });
  }

  // Rain splash particle
  addSplash(x, y) {
    for (let i = 0; i < 2; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 30 + Math.random() * 50;
      this.particles.push({
        type: 'splash',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 3 + Math.random() * 3,
        life: 1.0,
        decay: 6.0,
        color: 'rgba(50, 80, 140, 0.7)',
        seed: Math.random() * 100,
      });
    }
  }

  update(dt = 1 / 60) {
    // Update sparks & dust
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'spark') {
        p.vy += 200 * dt; // gravity
      } else if (p.type === 'dust') {
        p.radius += 4 * dt;
      }
    }

    // Update slash trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const t = this.slashTrails[i];
      t.life -= t.decay * dt;
      if (t.life <= 0) {
        this.slashTrails.splice(i, 1);
      }
    }

    // Update floating damage texts
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const d = this.damageTexts[i];
      d.life -= d.decay * dt;
      if (d.life <= 0) {
        this.damageTexts.splice(i, 1);
        continue;
      }
      d.y += d.vy * dt;
      d.vy *= 0.94;
    }
  }

  draw(ctx) {
    // 1. Draw slash trails (hand-drawn motion arcs with alpha fading along the tail)
    for (const trail of this.slashTrails) {
      const n = trail.points.length;
      if (n < 2) continue;
      ctx.save();

      for (let j = 1; j < n; j++) {
        const pPrev = trail.points[j - 1];
        const pCurr = trail.points[j];
        // Fade alpha and width along the tail: index 0 (oldest) is faint, tip is vibrant
        const tailFactor = j / (n - 1);
        const segAlpha = Math.max(0, Math.min(1, trail.life * 0.9 * (0.15 + 0.85 * tailFactor)));

        ctx.save();
        ctx.globalAlpha = segAlpha;

        for (let pass = 0; pass < 2; pass++) {
          const jit1 = renderer.getJitter(trail.seed + (j - 1) * 5 + pass * 10, 1.2);
          const jit2 = renderer.getJitter(trail.seed + j * 5 + pass * 10, 1.2);

          ctx.beginPath();
          ctx.moveTo(pPrev.x + jit1.x, pPrev.y + jit1.y);
          ctx.lineTo(pCurr.x + jit2.x, pCurr.y + jit2.y);
          ctx.strokeStyle = trail.color;
          ctx.lineWidth = trail.width * (0.3 + 0.7 * tailFactor) * trail.life * (pass === 0 ? 1.2 : 0.7);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
    }

    // 2. Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);

      if (p.type === 'spark') {
        const angle = Math.atan2(p.vy, p.vx);
        const len = p.length * p.life;
        const x2 = p.x - Math.cos(angle) * len;
        const y2 = p.y - Math.sin(angle) * len;
        renderer.sketchLine(ctx, p.x, p.y, x2, y2, {
          color: p.color,
          width: 1.8,
          roughness: 0.8,
          seed: p.seed,
        });
      } else if (p.type === 'impact_star') {
        // Sketched 4-point impact star
        const s = p.size * p.life;
        renderer.sketchLine(ctx, p.x - s, p.y, p.x + s, p.y, { color: p.color, width: 2, seed: p.seed });
        renderer.sketchLine(ctx, p.x, p.y - s, p.x, p.y + s, { color: p.color, width: 2, seed: p.seed + 10 });
        renderer.sketchLine(ctx, p.x - s * 0.6, p.y - s * 0.6, p.x + s * 0.6, p.y + s * 0.6, { color: p.color, width: 1.5, seed: p.seed + 20 });
        renderer.sketchLine(ctx, p.x - s * 0.6, p.y + s * 0.6, p.x + s * 0.6, p.y - s * 0.6, { color: p.color, width: 1.5, seed: p.seed + 30 });
      } else if (p.type === 'dust') {
        renderer.sketchCircle(ctx, p.x, p.y, p.radius, {
          color: p.color,
          fill: 'rgba(230, 220, 200, 0.3)',
          width: 1.2,
          roughness: 1.0,
          seed: p.seed,
        });
      } else if (p.type === 'splash') {
        const len = p.length * p.life;
        renderer.sketchLine(ctx, p.x, p.y, p.x + p.vx * 0.05, p.y + p.vy * 0.05 - len, {
          color: p.color,
          width: 1.4,
          roughness: 0.5,
          seed: p.seed,
        });
      }

      ctx.restore();
    }

    // 3. Draw Damage Popups
    for (const d of this.damageTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.life);
      renderer.sketchText(ctx, d.text, d.x, d.y, {
        font: `bold ${Math.round(20 * d.scale)}px 'Permanent Marker', cursive`,
        color: d.color,
        align: 'center',
        seed: d.y,
      });
      ctx.restore();
    }
  }
}

export const particles = new ParticleSystem();
