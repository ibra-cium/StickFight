// Dual-Zone Touch Gesture Engine for Mobile Controls

import { renderer } from '../graphics/NotebookRenderer.js';

export class TouchGestures {
  constructor(canvas, input, game) {
    this.canvas = canvas || document.getElementById('game-canvas');
    this.input = input;
    this.game = game;

    this.enabled = (localStorage.getItem('notebook_duel_control_mode') || 'gesture') === 'gesture';

    // Pointers tracking
    this.movePointerId = null;
    this.combatPointerId = null;

    // Movement (Left Zone) State
    this.moveOrigin = { x: 0, y: 0 };
    this.moveCurrent = { x: 0, y: 0 };
    this.moveStartTime = 0;
    this.moveFlickJumped = false;
    this.moveFlickCrouched = false;
    this.joystickOpacity = 0; // 0..1 (fade in 100ms, fade out 150ms)
    this.joystickActive = false;

    // Combat (Right Zone) State
    this.combatOrigin = { x: 0, y: 0 };
    this.combatCurrent = { x: 0, y: 0 };
    this.combatStartTime = 0;
    this.combatSwipeTriggered = false;
    this.lastRightTapTime = 0;
    this.lastRightTapPos = { x: 0, y: 0 };
    this.trailPoints = []; // [{ x, y, alpha, time }]

    // Single-frame pulses
    this.jumpPulse = false;
    this.attackPulse = false;
    this.heavyPulse = false;
    this.dashPulse = false;

    // Onboarding Tutorial State
    this.tutorialSeen = localStorage.getItem('notebook_duel_gesture_tutorial_seen') === 'true';
    this.tutorialTimer = 0;
    this.tutorialMaxDuration = 8.0;
    this.tutorialAlpha = this.tutorialSeen ? 0 : 1.0;
    this.tutorialDismissed = this.tutorialSeen;

    this.initEvents();
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled) {
      this.reset();
    }
  }

  reset() {
    this.movePointerId = null;
    this.combatPointerId = null;
    this.joystickActive = false;
    this.joystickOpacity = 0;
    this.trailPoints = [];

    this.jumpPulse = false;
    this.attackPulse = false;
    this.heavyPulse = false;
    this.dashPulse = false;

    if (this.input) {
      this.input.touch.left = false;
      this.input.touch.right = false;
      this.input.touch.jump = false;
      this.input.touch.block = false;
      this.input.touch.crouch = false;
      this.input.touch.attack = false;
      this.input.touch.heavy = false;
      this.input.touch.dash = false;
      this.input.touchAxisX = 0;
    }
  }

  getTouchPos(e) {
    if (this.game && this.game.toGameCoords) {
      return this.game.toGameCoords(e.clientX, e.clientY);
    }
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  initEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerCancel(e), { passive: false });
  }

  onPointerDown(e) {
    if (!this.enabled || !this.game || this.game.state !== 'playing') return;
    e.preventDefault();

    const pos = this.getTouchPos(e);
    const gameW = this.game.width || 960;
    const gameH = this.game.height || 540;
    const midX = gameW / 2;

    // LEFT ZONE: Movement
    if (pos.x < midX && this.movePointerId === null) {
      this.movePointerId = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
      this.moveOrigin = { x: pos.x, y: pos.y };
      this.moveCurrent = { x: pos.x, y: pos.y };
      this.moveStartTime = performance.now();
      this.moveFlickJumped = false;
      this.moveFlickCrouched = false;
      this.joystickActive = true;
      return;
    }

    // RIGHT ZONE: Combat (Keep clear of bottom 8% of screen to prevent Android back gestures)
    if (pos.x >= midX && pos.y <= gameH * 0.92 && this.combatPointerId === null) {
      this.combatPointerId = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
      this.combatOrigin = { x: pos.x, y: pos.y };
      this.combatCurrent = { x: pos.x, y: pos.y };
      const now = performance.now();
      this.combatStartTime = now;
      this.combatSwipeTriggered = false;

      // Add to trail
      this.trailPoints.push({ x: pos.x, y: pos.y, alpha: 1.0, time: now });

      // Double-tap check for DASH (two taps within 260ms within 60px)
      const tapDist = Math.hypot(pos.x - this.lastRightTapPos.x, pos.y - this.lastRightTapPos.y);
      if (now - this.lastRightTapTime <= 260 && tapDist < 60) {
        this.dashPulse = true;
        this.input.touch.dash = true;
        this.lastRightTapTime = 0; // reset
      } else {
        // Zero latency LIGHT ATTACK pulse on initial tap
        this.attackPulse = true;
        this.input.touch.attack = true;
        this.lastRightTapTime = now;
        this.lastRightTapPos = { x: pos.x, y: pos.y };
      }
    }
  }

  onPointerMove(e) {
    if (!this.enabled || !this.game || this.game.state !== 'playing') return;

    const pos = this.getTouchPos(e);
    const now = performance.now();

    // Movement Pointer Move
    if (e.pointerId === this.movePointerId) {
      e.preventDefault();
      this.moveCurrent = { x: pos.x, y: pos.y };

      const dx = this.moveCurrent.x - this.moveOrigin.x;
      const dy = this.moveCurrent.y - this.moveOrigin.y;
      const elapsed = now - this.moveStartTime;

      // Flick UP -> Jump (dy < -45px within 220ms)
      if (!this.moveFlickJumped && elapsed <= 220 && dy < -45) {
        this.jumpPulse = true;
        this.input.touch.jump = true;
        this.moveFlickJumped = true;
      }

      // Flick DOWN -> Crouch (dy > 45px within 220ms)
      if (!this.moveFlickCrouched && elapsed <= 220 && dy > 45) {
        this.input.touch.crouch = true;
        this.moveFlickCrouched = true;
      } else if (dy < 20) {
        this.input.touch.crouch = false;
      }

      // Joystick Analog X (Dead zone 14px, Max radius 70px)
      const absDx = Math.abs(dx);
      if (absDx < 14) {
        this.input.touchAxisX = 0;
        this.input.touch.left = false;
        this.input.touch.right = false;
      } else {
        const sign = Math.sign(dx);
        const norm = Math.min(1.0, (absDx - 14) / (70 - 14));
        this.input.touchAxisX = sign * norm;
        this.input.touch.left = (sign < 0);
        this.input.touch.right = (sign > 0);
      }

      // Pull BACKWARD to Block:
      // Player facing: 1 = facing right (away is dx < -28), -1 = facing left (away is dx > 28)
      const playerFacing = (this.game.player && this.game.player.facing) || 1;
      const isPullingBack = (playerFacing === 1 && dx < -28) || (playerFacing === -1 && dx > 28);
      this.input.touch.block = isPullingBack;
    }

    // Combat Pointer Move
    if (e.pointerId === this.combatPointerId) {
      e.preventDefault();
      this.combatCurrent = { x: pos.x, y: pos.y };

      // Trail recording
      this.trailPoints.push({ x: pos.x, y: pos.y, alpha: 1.0, time: now });

      const dx = this.combatCurrent.x - this.combatOrigin.x;
      const dy = this.combatCurrent.y - this.combatOrigin.y;
      const dist = Math.hypot(dx, dy);
      const elapsed = now - this.combatStartTime;

      // Check Swipe (> 26px within 250ms)
      if (!this.combatSwipeTriggered && dist > 26 && elapsed <= 250) {
        this.combatSwipeTriggered = true;

        // Cancel light attack and trigger heavy attack
        this.input.touch.attack = false;
        this.heavyPulse = true;
        this.input.touch.heavy = true;

        // Dismiss tutorial if first heavy attack performed
        this.dismissTutorial();

        // Determine heavy variant direction:
        // down -> 'overhead', up -> 'uppercut', forward -> 'thrust'
        const playerFacing = (this.game.player && this.game.player.facing) || 1;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absY > absX) {
          if (dy > 0) {
            this.input.heavyVariant = 'overhead'; // swipe down
          } else {
            this.input.heavyVariant = 'uppercut'; // swipe up
          }
        } else {
          // Horizontal swipe
          const swipeDir = Math.sign(dx);
          if (swipeDir === playerFacing) {
            this.input.heavyVariant = 'thrust'; // swipe forward towards opponent
          } else {
            this.input.heavyVariant = 'overhead';
          }
        }
      }
    }
  }

  onPointerUp(e) {
    if (e.pointerId === this.movePointerId) {
      this.movePointerId = null;
      this.joystickActive = false;
      if (this.input) {
        this.input.touch.left = false;
        this.input.touch.right = false;
        this.input.touch.block = false;
        this.input.touch.crouch = false;
        this.input.touchAxisX = 0;
      }
    }

    if (e.pointerId === this.combatPointerId) {
      this.combatPointerId = null;
      if (this.input) {
        this.input.touch.attack = false;
        this.input.touch.heavy = false;
        this.input.touch.dash = false;
      }
    }
  }

  onPointerCancel(e) {
    this.onPointerUp(e);
  }

  dismissTutorial() {
    if (!this.tutorialDismissed) {
      this.tutorialDismissed = true;
      this.tutorialSeen = true;
      localStorage.setItem('notebook_duel_gesture_tutorial_seen', 'true');
    }
  }

  update(dt = 1 / 60) {
    if (!this.enabled) return;

    // Reset single-frame pulses
    if (this.jumpPulse) {
      this.jumpPulse = false;
      if (this.input) this.input.touch.jump = false;
    }
    if (this.attackPulse) {
      this.attackPulse = false;
      if (this.input) this.input.touch.attack = false;
    }
    if (this.heavyPulse) {
      this.heavyPulse = false;
      if (this.input) this.input.touch.heavy = false;
    }
    if (this.dashPulse) {
      this.dashPulse = false;
      if (this.input) this.input.touch.dash = false;
    }

    // Joystick Fade In (100ms) / Fade Out (150ms)
    if (this.joystickActive) {
      this.joystickOpacity = Math.min(1.0, this.joystickOpacity + dt / 0.10);
    } else {
      this.joystickOpacity = Math.max(0.0, this.joystickOpacity - dt / 0.15);
    }

    // Update trail points decay
    const now = performance.now();
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const pt = this.trailPoints[i];
      const age = (now - pt.time) / 1000;
      pt.alpha = Math.max(0, 1 - age / 0.35); // 350ms fade
      if (pt.alpha <= 0) {
        this.trailPoints.splice(i, 1);
      }
    }

    // Tutorial timers
    if (!this.tutorialSeen) {
      this.tutorialTimer += dt;
      if (this.tutorialTimer >= this.tutorialMaxDuration) {
        this.dismissTutorial();
      }
    }
    if (this.tutorialDismissed && this.tutorialAlpha > 0) {
      this.tutorialAlpha = Math.max(0, this.tutorialAlpha - dt * 2);
    }
  }

  draw(ctx, width, height) {
    if (!this.enabled || !this.game || this.game.state !== 'playing') return;

    ctx.save();

    // 1. Draw Dynamic Joystick (Left Zone)
    if (this.joystickOpacity > 0.01) {
      this.drawJoystick(ctx);
    }

    // 2. Draw Ink Swipe Trail (Right Zone)
    if (this.trailPoints.length > 1) {
      this.drawSwipeTrail(ctx);
    }

    // 3. Draw Onboarding Tutorial Doodles (if not completed)
    if (this.tutorialAlpha > 0.01) {
      this.drawTutorial(ctx, width, height);
    }

    ctx.restore();
  }

  drawJoystick(ctx) {
    const origin = this.moveOrigin;
    const current = this.moveCurrent;
    const opacity = this.joystickOpacity;

    const dx = current.x - origin.x;
    const dy = current.y - origin.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 70;

    // Clamped thumb position
    const clampDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const thumbX = origin.x + Math.cos(angle) * clampDist;
    const thumbY = origin.y + Math.sin(angle) * clampDist;

    ctx.save();
    ctx.globalAlpha = opacity * 0.85;

    // Outer Circle (Radius 70)
    renderer.sketchCircle(ctx, origin.x, origin.y, maxRadius, {
      color: '#333',
      width: 2.0,
      roughness: 1.2,
      seed: origin.x + origin.y,
    });

    // Outer Subtle Fill
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(235, 230, 210, 0.25)';
    ctx.fill();

    // Connecting line from center to thumb
    if (dist > 10) {
      renderer.sketchLine(ctx, origin.x, origin.y, thumbX, thumbY, {
        color: '#666',
        width: 1.8,
        seed: origin.x,
      });
    }

    // Inner Thumb Cap (Radius 22)
    renderer.sketchCircle(ctx, thumbX, thumbY, 22, {
      fill: 'rgba(30, 30, 30, 0.75)',
      color: '#111',
      width: 2.2,
      seed: thumbX + thumbY,
    });

    // Subtle hand-drawn crosshairs in center
    renderer.sketchLine(ctx, origin.x - 8, origin.y, origin.x + 8, origin.y, { color: '#888', width: 1.2, seed: 1 });
    renderer.sketchLine(ctx, origin.x, origin.y - 8, origin.x, origin.y + 8, { color: '#888', width: 1.2, seed: 2 });

    ctx.restore();
  }

  drawSwipeTrail(ctx) {
    if (this.trailPoints.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p1 = this.trailPoints[i - 1];
      const p2 = this.trailPoints[i];
      const alpha = ((p1.alpha + p2.alpha) / 2) * 0.85;

      ctx.strokeStyle = `rgba(180, 40, 40, ${alpha})`;
      ctx.lineWidth = Math.max(1.5, 5.0 * alpha);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Graphite jitter edge pass
      ctx.strokeStyle = `rgba(30, 30, 30, ${alpha * 0.6})`;
      ctx.lineWidth = Math.max(1.0, 2.5 * alpha);
      ctx.beginPath();
      ctx.moveTo(p1.x + Math.sin(i) * 1.5, p1.y + Math.cos(i) * 1.5);
      ctx.lineTo(p2.x + Math.cos(i) * 1.5, p2.y + Math.sin(i) * 1.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTutorial(ctx, width, height) {
    const alpha = this.tutorialAlpha;
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha * 0.88;

    const leftCX = width * 0.22;
    const rightCX = width * 0.78;
    const bottomY = height * 0.78;
    const bob = Math.sin(performance.now() / 250) * 3;

    // LEFT ZONE TUTORIAL
    // Drag to move / Pull back to guard
    renderer.sketchBox(ctx, leftCX - 120, bottomY - 60, 240, 75, {
      fill: 'rgba(255, 255, 255, 0.7)',
      color: '#444',
      width: 1.8,
      seed: 101,
    });
    renderer.sketchText(ctx, "👈 DRAG: Move / Run", leftCX, bottomY - 38 + bob * 0.5, {
      font: "bold 15px 'Permanent Marker', cursive",
      color: '#111',
      seed: 102,
    });
    renderer.sketchText(ctx, "🛡 PULL BACK: Guard | ⬆ FLICK: Jump", leftCX, bottomY - 14, {
      font: "13px 'Architects Daughter', cursive",
      color: '#0d47a1',
      seed: 103,
    });

    // RIGHT ZONE TUTORIAL
    // Tap to strike / Swipe for heavy
    renderer.sketchBox(ctx, rightCX - 120, bottomY - 60, 240, 75, {
      fill: 'rgba(255, 255, 255, 0.7)',
      color: '#444',
      width: 1.8,
      seed: 104,
    });
    renderer.sketchText(ctx, "👉 TAP: Light Attack", rightCX, bottomY - 38 + bob * 0.5, {
      font: "bold 15px 'Permanent Marker', cursive",
      color: '#111',
      seed: 105,
    });
    renderer.sketchText(ctx, "💥 SWIPE: Heavy (⬇ Cleave / ⬆ Uppercut)", rightCX, bottomY - 14, {
      font: "13px 'Architects Daughter', cursive",
      color: '#b71c1c',
      seed: 106,
    });

    // Center Hint
    renderer.sketchText(ctx, "Double-Tap Right: Dash", width / 2, height * 0.88, {
      font: "14px 'Caveat', cursive",
      color: '#555',
      seed: 107,
    });

    ctx.restore();
  }
}
