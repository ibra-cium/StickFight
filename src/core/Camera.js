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

    // Shake properties
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Hitstop / freeze frame counter
    this.hitstopFrames = 0;
  }

  resize(viewportWidth, viewportHeight) {
    this.width = viewportWidth;
    this.height = viewportHeight;
  }

  shake(intensity = 8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  hitstop(frames = 3) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  update(fighter1, fighter2, dt = 1/60) {
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
    }

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

    // Smooth follow
    this.x += (this.targetX - this.x) * 0.1;
    this.y += (this.targetY - this.y) * 0.1;
    this.zoom += (this.targetZoom - this.zoom) * 0.08;

    // Shake decay and random offset
    if (this.shakeIntensity > 0.1) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
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
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx) {
    ctx.restore();
  }

  worldToScreen(worldX, worldY) {
    const cx = this.width / 2 + this.shakeOffsetX;
    const cy = this.height / 2 + this.shakeOffsetY;
    return {
      x: cx + (worldX - this.x) * this.zoom,
      y: cy + (worldY - this.y) * this.zoom,
    };
  }
}
