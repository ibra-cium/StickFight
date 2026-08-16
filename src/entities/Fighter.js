// Base Fighter Class managing Animation, Physics, State Machine & Combat Stats

import { Skeleton } from './Skeleton.js';
import { particles } from '../graphics/Particles.js';
import { sound } from '../core/Audio.js';

export class Fighter {
  constructor(name, config = {}) {
    this.name = name;
    this.isPlayer = !!config.isPlayer;
    this.isBoss = !!config.isBoss;

    // Stats
    this.maxHp = config.maxHp || 100;
    this.hp = this.maxHp;
    this.attackPower = config.attackPower || 15;
    this.heavyAttackPower = config.heavyAttackPower || 30;
    this.speed = config.speed || 170;
    this.facing = config.facing || 1; // 1 = right, -1 = left

    // Position & Physics
    this.x = config.x || 0;
    this.y = 75; // ground root position
    this.vx = 0;
    this.vy = 0;
    this.groundY = 75;
    this.gravity = 900;
    this.isGrounded = true;

    // Skeleton
    this.skeleton = new Skeleton(config);
    this.scale = this.skeleton.scale;

    // State machine
    this.state = 'idle'; // idle, walk, run, windup, attack, heavy_windup, heavy_attack, block, hit, knockback, dead, victory
    this.stateTimer = 0;
    this.animCycle = 0;

    // Combat timers
    this.attackCooldown = 0;
    this.parryWindow = 0; // Active parry frames
    this.isBlocking = false;
    this.hurtTimer = 0;
    this.invulnerableTimer = 0;
    this.comboCount = 0;

    // Attack hitbox & blade trail tracking
    this.hasHitThisSwing = false;
    this.swordTrailPoints = [];

    // Footstep audio throttle
    this.lastFootstepTime = 0;
  }

  jump(force = 440) {
    if (!this.isGrounded || ['dead', 'hit', 'knockback', 'victory', 'block', 'windup', 'attack', 'heavy_windup', 'heavy_attack'].includes(this.state)) return;
    this.vy = -force;
    this.isGrounded = false;
    sound.playJump();
    particles.addDust(this.x, this.groundY, this.facing);
  }

  reset(x, facing = 1) {
    this.hp = this.maxHp;
    this.x = x;
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.facing = facing;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.parryWindow = 0;
    this.isBlocking = false;
    this.hurtTimer = 0;
    this.invulnerableTimer = 0;
    this.hasHitThisSwing = false;
  }

  startAttack(isHeavy = false) {
    if (this.attackCooldown > 0 || ['hit', 'knockback', 'dead', 'victory'].includes(this.state)) return false;
    this.state = isHeavy ? 'heavy_windup' : 'windup';
    this.stateTimer = 0;
    this.hasHitThisSwing = false;
    this.swordTrailPoints = [];
    return true;
  }

  startBlock() {
    if (['hit', 'knockback', 'dead', 'victory', 'attack', 'heavy_attack'].includes(this.state)) return;
    if (this.state !== 'block') {
      this.state = 'block';
      this.stateTimer = 0;
      this.parryWindow = 0.18; // 180ms parry window
    }
  }

  stopBlock() {
    if (this.state === 'block') {
      this.state = 'idle';
      this.isBlocking = false;
      this.parryWindow = 0;
    }
  }

  takeDamage(amount, knockbackForce = 150, attackerX = 0, isHeavy = false) {
    if (this.state === 'dead' || this.invulnerableTimer > 0) return { type: 'miss' };

    // Check Parry
    if (this.state === 'block' && this.parryWindow > 0) {
      sound.playParry();
      particles.addParryEffect(this.x + this.facing * 20, this.y - 20);
      return { type: 'parry', reflectedDamage: 10 };
    }

    // Check Regular Block
    if (this.state === 'block') {
      sound.playBlock();
      const blockedAmount = Math.max(1, Math.round(amount * 0.2)); // 80% damage reduction
      this.hp -= blockedAmount;
      this.vx = (this.x > attackerX ? 1 : -1) * (knockbackForce * 0.25);
      particles.addSparkBurst(this.x + this.facing * 15, this.y - 15, 6, '#0d47a1');
      particles.addDamageText(`BLOCKED -${blockedAmount}`, this.x, this.y - 40, '#0d47a1');

      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
      }
      return { type: 'block', damage: blockedAmount };
    }

    // Direct Hit
    this.hp -= amount;
    this.hurtTimer = 0.25;
    this.invulnerableTimer = 0.15;
    sound.playHit(isHeavy);

    // Apply knockback
    const dir = this.x > attackerX ? 1 : -1;
    this.vx = dir * knockbackForce;
    if (isHeavy) this.vy = -180;

    particles.addSparkBurst(this.x, this.y - 25, isHeavy ? 14 : 8, '#b71c1c');
    particles.addDamageText(`-${amount}`, this.x, this.y - 40, '#b71c1c');

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return { type: 'death', damage: amount };
    } else {
      this.state = isHeavy ? 'knockback' : 'hit';
      this.stateTimer = 0;
      return { type: 'hit', damage: amount };
    }
  }

  die() {
    this.state = 'dead';
    this.stateTimer = 0;
    this.vx = -this.facing * 90;
    this.vy = -150;
    if (!this.isPlayer) sound.playVictory();
    else sound.playDefeat();
  }

  triggerVictory() {
    if (this.state !== 'dead') {
      this.state = 'victory';
      this.stateTimer = 0;
      this.vx = 0;
    }
  }

  update(dt = 1 / 60) {
    this.stateTimer += dt;
    this.animCycle += dt;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.parryWindow > 0) this.parryWindow -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    // Apply Physics
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
    }

    // Ground collision
    const wasGrounded = this.isGrounded;
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      this.isGrounded = true;
      if (!wasGrounded) {
        particles.addDust(this.x, this.groundY, this.facing);
        sound.playFootstep();
      }
    } else {
      this.isGrounded = false;
    }

    // Friction
    if (this.isGrounded) {
      this.vx *= 0.82;
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // Arena boundary clamp
    if (this.x < -650) this.x = -650;
    if (this.x > 650) this.x = 650;

    // Process State Transitions
    this.processState(dt);

    // Compute joints and record sword blade tip for trails
    const seed = Math.floor(this.animCycle * 15);
    this.skeleton.computeJoints(this.x, this.y, this.facing, seed);

    if (['attack', 'heavy_attack'].includes(this.state)) {
      this.swordTrailPoints.push({ x: this.skeleton.joints.swordTip.x, y: this.skeleton.joints.swordTip.y });
      if (this.swordTrailPoints.length > 8) this.swordTrailPoints.shift();
      if (this.swordTrailPoints.length >= 2) {
        particles.addSlashTrail(this.swordTrailPoints, this.isBoss ? '#000' : '#222', (this.state === 'heavy_attack' ? 5 : 3) * this.scale);
      }
    }
  }

  processState(dt) {
    const a = this.skeleton.angles;

    // Aerial pose when airborne and not attacking/hurt
    if (!this.isGrounded && ['idle', 'walk', 'run'].includes(this.state)) {
      const jumpRatio = Math.min(1, Math.max(-1, this.vy / 400));
      a.torso = 0.12;
      a.head = -0.08;
      a.rightHip = -0.35 - jumpRatio * 0.15;
      a.rightKnee = 0.65;
      a.leftHip = -0.15 - jumpRatio * 0.15;
      a.leftKnee = 0.45;
      a.rightShoulder = -1.1;
      a.rightElbow = -0.8;
      a.leftShoulder = 0.5;
      a.leftElbow = 0.7;
      a.swordAngle = -0.4;
      return;
    }

    switch (this.state) {
      case 'idle': {
        // Breathing bounce & subtle sword sway
        const breath = Math.sin(this.animCycle * 3.5);
        a.torso = 0.05 + breath * 0.03;
        a.head = -0.05 - breath * 0.03;
        a.rightShoulder = -0.7 + breath * 0.05;
        a.rightElbow = -0.9 + breath * 0.05;
        a.leftShoulder = 0.4 + breath * 0.04;
        a.leftElbow = 0.7;
        a.rightHip = 0.15;
        a.rightKnee = 0.2;
        a.leftHip = -0.2;
        a.leftKnee = 0.2;
        a.swordAngle = -0.3 + breath * 0.05;
        break;
      }

      case 'walk':
      case 'run': {
        const speedMultiplier = this.state === 'run' ? 12 : 8;
        const stride = Math.sin(this.animCycle * speedMultiplier);
        const lean = this.state === 'run' ? 0.3 : 0.15;

        a.torso = lean;
        a.head = -lean * 0.5;
        a.rightHip = stride * 0.6;
        a.rightKnee = Math.max(0, -stride * 0.5) + 0.2;
        a.leftHip = -stride * 0.6;
        a.leftKnee = Math.max(0, stride * 0.5) + 0.2;

        // Sword carried in ready position
        a.rightShoulder = -0.5 - stride * 0.2;
        a.rightElbow = -1.1;
        a.leftShoulder = 0.4 + stride * 0.3;
        a.leftElbow = 0.8;
        a.swordAngle = -0.5;

        // Footstep sound & dust on foot strike
        if (Math.abs(stride) > 0.95 && performance.now() - this.lastFootstepTime > 220) {
          this.lastFootstepTime = performance.now();
          sound.playFootstep();
          particles.addDust(this.x, this.groundY, this.facing);
        }
        break;
      }

      case 'windup': {
        // Pull sword back
        const progress = Math.min(1, this.stateTimer / 0.14);
        a.torso = -0.25 * progress;
        a.head = 0.1 * progress;
        a.rightShoulder = -1.4 * progress;
        a.rightElbow = -1.6 * progress;
        a.leftShoulder = 0.6;
        a.leftElbow = 0.9;
        a.rightHip = -0.3 * progress;
        a.leftHip = 0.3 * progress;
        a.swordAngle = -0.9 * progress;

        if (this.stateTimer >= 0.14) {
          this.state = 'attack';
          this.stateTimer = 0;
          this.vx = this.facing * 160; // Attack lunge forward
          sound.playSwing(false);
        }
        break;
      }

      case 'attack': {
        // Explosive forward slash
        const progress = Math.min(1, this.stateTimer / 0.18);
        const ease = Math.sin((progress * Math.PI) / 2);

        a.torso = -0.25 + 0.55 * ease;
        a.head = -0.15 * ease;
        a.rightShoulder = -1.4 + 2.6 * ease;
        a.rightElbow = -1.6 + 1.2 * ease;
        a.swordAngle = -0.9 + 2.2 * ease;
        a.leftShoulder = -0.2;
        a.leftElbow = 0.4;
        a.rightHip = 0.4 * ease;
        a.leftHip = -0.3 * ease;

        if (this.stateTimer >= 0.18) {
          this.state = 'idle';
          this.stateTimer = 0;
          this.attackCooldown = 0.22;
          this.swordTrailPoints = [];
        }
        break;
      }

      case 'heavy_windup': {
        // Deep overhead windup
        const progress = Math.min(1, this.stateTimer / 0.32);
        a.torso = -0.4 * progress;
        a.head = 0.2 * progress;
        a.rightShoulder = -2.2 * progress; // High overhead
        a.rightElbow = -1.8 * progress;
        a.leftShoulder = -1.5 * progress;
        a.leftElbow = -1.2 * progress;
        a.swordAngle = -1.2 * progress;

        if (this.stateTimer >= 0.32) {
          this.state = 'heavy_attack';
          this.stateTimer = 0;
          this.vx = this.facing * 260; // Colossal lunge
          sound.playSwing(true);
        }
        break;
      }

      case 'heavy_attack': {
        // Massive overhead cleave
        const progress = Math.min(1, this.stateTimer / 0.24);
        const ease = Math.sin((progress * Math.PI) / 2);

        a.torso = -0.4 + 0.9 * ease;
        a.head = -0.3 * ease;
        a.rightShoulder = -2.2 + 3.8 * ease;
        a.rightElbow = -1.8 + 1.6 * ease;
        a.leftShoulder = -1.5 + 2.8 * ease;
        a.leftElbow = -1.2 + 1.6 * ease;
        a.swordAngle = -1.2 + 3.0 * ease;

        if (this.stateTimer >= 0.24) {
          this.state = 'idle';
          this.stateTimer = 0;
          this.attackCooldown = 0.45;
          this.swordTrailPoints = [];
        }
        break;
      }

      case 'block': {
        // Defensive crossguard shield stance
        this.isBlocking = true;
        a.torso = -0.15;
        a.head = 0.1;
        a.rightShoulder = 0.5;
        a.rightElbow = -1.8;
        a.leftShoulder = 0.8;
        a.leftElbow = -1.4;
        a.swordAngle = 1.3; // Sword held vertically across torso
        a.rightHip = -0.3;
        a.rightKnee = 0.4;
        a.leftHip = 0.3;
        a.leftKnee = 0.4;
        break;
      }

      case 'hit': {
        // Flinch recoil
        const progress = Math.min(1, this.stateTimer / 0.22);
        a.torso = -0.4 * (1 - progress);
        a.head = 0.4 * (1 - progress);
        a.rightShoulder = -0.2;
        a.rightElbow = -0.4;
        a.swordAngle = -0.2;

        if (this.stateTimer >= 0.22) {
          this.state = 'idle';
          this.stateTimer = 0;
        }
        break;
      }

      case 'knockback': {
        // Flying back spin
        a.torso = -0.8;
        a.head = 0.6;
        a.rightShoulder = -1.2;
        a.leftShoulder = 1.2;
        a.rightHip = -0.6;
        a.leftHip = 0.6;

        if (this.isGrounded && this.stateTimer > 0.4) {
          this.state = 'idle';
          this.stateTimer = 0;
        }
        break;
      }

      case 'dead': {
        // Defeated ragdoll fall
        const fall = Math.min(1, this.stateTimer / 0.35);
        a.torso = 1.5 * fall; // Flat on back/chest
        a.head = 0.5 * fall;
        a.rightShoulder = 1.2;
        a.rightElbow = 0.3;
        a.leftShoulder = -1.0;
        a.rightHip = 0.2;
        a.leftHip = 0.4;
        a.swordAngle = 2.0;
        break;
      }

      case 'victory': {
        // Sword thrust triumphantly in the air
        const bounce = Math.abs(Math.sin(this.animCycle * 5));
        a.torso = -0.1;
        a.head = -0.3;
        a.rightShoulder = -2.8; // Hand straight up in the air
        a.rightElbow = -0.2;
        a.swordAngle = -0.1; // Sword pointing straight up
        a.leftShoulder = 0.6;
        a.leftElbow = 1.4;
        a.rightHip = 0.2;
        a.leftHip = -0.2;
        break;
      }
    }
  }

  // Get sword line segment for hit detection
  getSwordSegment() {
    return {
      p1: this.skeleton.joints.swordHilt,
      p2: this.skeleton.joints.swordTip,
    };
  }

  // Get body hurtbox circle
  getHurtbox() {
    return {
      x: this.skeleton.joints.chest.x,
      y: (this.skeleton.joints.chest.y + this.skeleton.joints.hips.y) / 2,
      radius: (this.skeleton.headRadius * 1.8),
    };
  }

  draw(ctx) {
    const isHurt = this.hurtTimer > 0;
    const seed = Math.floor(this.animCycle * 14);
    this.skeleton.draw(ctx, this.x, this.y, this.facing, seed, isHurt);
  }
}
