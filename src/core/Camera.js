// Dynamic side-view 2D Camera with Screen Shake, Zoom & Hitstop

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.width = viewportWidth;
    this.height = viewportHeight;

    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.85;
    this.maxZoom = 1.25;

    // Hit impact zoom punch
    this.hitZoom = 1.0;

    // Shake properties
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Hitstop / freeze frame timer (in seconds)
    this.hitstopTimer = 0;

    // Slow motion on killing blow
    this.slowMoTimer = 0;
    this.slowMoScale = 0.25;
  }

  resize(viewportWidth, viewportHeight) {
    this.width = viewportWidth;
    this.height = viewportHeight;
  }

  shake(intensity = 8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  hitstop(duration = 0.05) {
    this.hitstopTimer = Math.max(this.hitstopTimer, duration);
  }

  triggerHitZoom(isHeavy = false) {
    this.hitZoom = isHeavy ? 1.09 : 1.05;
  }

  triggerSlowMo(duration = 0.5, scale = 0.25) {
    this.slowMoTimer = duration;
    this.slowMoScale = scale;
  }

  update(fighter1, fighter2, dt = 1/60) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
    }

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
    }

    // Ease hitZoom back to 1.0 over ~0.25s
    this.hitZoom += (1.0 - this.hitZoom) * (1 - Math.exp(-12 * dt));

    if (fighter1 && fighter2) {
      // Midpoint between fighters
      const midX = (fighter1.x + fighter2.x) / 2;
      const dist = Math.abs(fighter1.x - fighter2.x);

      this.targetX = midX;
      this.targetY = -30; // Slightly above ground

      // Zoom based on distance between fighters
      if (dist < 180) {
        this.targetZoom = 1.15;
      } else if (dist > 450) {
        this.targetZoom = 0.9;
      } else {
        this.targetZoom = 1.0;
      }
    } else if (fighter1) {
      this.targetX = fighter1.x;
      this.targetY = -30;
      this.targetZoom = 1.0;
    }

    // Smooth follow (Framerate Independent)
    this.x += (this.targetX - this.x) * (1 - Math.exp(-10 * dt));
    this.y += (this.targetY - this.y) * (1 - Math.exp(-10 * dt));
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-8 * dt));

    // Shake decay and random offset
    if (this.shakeIntensity > 0.1) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= Math.pow(this.shakeDecay, dt * 60);
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  begin(ctx) {
    ctx.save();
    // Center origin
    ctx.translate(this.width / 2 + this.shakeOffsetX, this.height / 2 + this.shakeOffsetY);
    const totalZoom = this.zoom * this.hitZoom;
    ctx.scale(totalZoom, totalZoom);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx) {
    ctx.restore();
  }

  worldToScreen(worldX, worldY) {
    const cx = this.width / 2 + this.shakeOffsetX;
    const cy = this.height / 2 + this.shakeOffsetY;
    const totalZoom = this.zoom * this.hitZoom;
    return {
      x: cx + (worldX - this.x) * totalZoom,
      y: cy + (worldY - this.y) * totalZoom,
    };
  }
}
