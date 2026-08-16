// AI Controlled Sword Fighter with Level-Adaptive FSM & Boss Mechanics

import { Fighter } from './Fighter.js';

export class EnemyAI extends Fighter {
  constructor(name, config = {}) {
    super(name, {
      isPlayer: false,
      isBoss: !!config.isBoss,
      maxHp: config.maxHp || 100,
      attackPower: config.attackPower || 12,
      heavyAttackPower: config.heavyAttackPower || 24,
      speed: config.speed || 140,
      color: config.color || '#1a1a1a',
      accessory: config.accessory || (config.isBoss ? 'boss_horns' : 'none'),
      scale: config.scale || 1.0,
      bladeLength: config.bladeLength || 44,
      bladeWidth: config.bladeWidth || 4.5,
      ...config,
    });

    // AI Behavioral Profile
    this.aggression = config.aggression || 0.4; // 0.0 to 1.0
    this.defenseRate = config.defenseRate || 0.1; // Probability to block player attacks
    this.counterRate = config.counterRate || 0.0; // Probability to counterattack right after block/hurt
    this.preferredDistance = config.preferredDistance || 85 * this.scale;
    this.attackInterval = config.attackInterval || 1.8; // Time between attack attempts

    // AI Decision timers & state
    this.aiState = 'APPROACH'; // IDLE, APPROACH, ATTACK, BLOCK, RETREAT
    this.decisionTimer = 0;
    this.aiAttackCooldown = 1.0;
    this.retreatTimer = 0;
    this.blockDuration = 0;
  }

  updateAI(dt, player) {
    if (['dead', 'victory'].includes(this.state)) return;
    if (!player || player.state === 'dead') {
      this.state = 'idle';
      this.vx = 0;
      return;
    }

    // Auto facing
    if (!['attack', 'heavy_attack', 'windup', 'heavy_windup', 'block'].includes(this.state)) {
      this.facing = player.x >= this.x ? 1 : -1;
    }

    this.decisionTimer -= dt;
    if (this.aiAttackCooldown > 0) this.aiAttackCooldown -= dt;
    if (this.retreatTimer > 0) this.retreatTimer -= dt;

    // React to being in hit or knockback state
    if (['hit', 'knockback'].includes(this.state)) {
      // Chance to retreat immediately after recovering
      if (Math.random() < 0.6) {
        this.aiState = 'RETREAT';
        this.retreatTimer = 0.5 + Math.random() * 0.4;
      }
      return;
    }

    // If currently executing an attack or windup, don't interrupt with AI movement
    if (['windup', 'attack', 'heavy_windup', 'heavy_attack'].includes(this.state)) {
      return;
    }

    // Handle Active Blocking
    if (this.state === 'block') {
      this.blockDuration -= dt;
      if (this.blockDuration <= 0) {
        this.stopBlock();
        // Chance to immediately counterattack
        if (Math.random() < this.counterRate && this.aiAttackCooldown <= 0) {
          this.startAttack(this.isBoss ? Math.random() < 0.4 : false);
          this.aiAttackCooldown = this.attackInterval;
        }
      }
      return;
    }

    const dist = Math.abs(player.x - this.x);

    // Defensive Reaction: If player is winding up an attack nearby, chance to block
    if (['windup', 'heavy_windup', 'attack', 'heavy_attack'].includes(player.state) && dist < this.preferredDistance + 60) {
      if (Math.random() < this.defenseRate && this.state !== 'block') {
        this.startBlock();
        this.blockDuration = 0.35 + Math.random() * 0.3;
        this.vx = 0;
        return;
      }
    }

    // AI State Machine
    if (this.retreatTimer > 0) {
      this.aiState = 'RETREAT';
    } else if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.25 + Math.random() * 0.35;

      if (dist > this.preferredDistance + 25) {
        this.aiState = 'APPROACH';
      } else if (dist < this.preferredDistance - 25) {
        // Too close, chance to retreat or attack
        this.aiState = Math.random() < 0.5 ? 'RETREAT' : 'ATTACK';
      } else {
        // In fighting sweet-spot range
        const roll = Math.random();
        if (roll < this.aggression) {
          this.aiState = 'ATTACK';
        } else if (roll < this.aggression + 0.3) {
          this.aiState = 'IDLE';
        } else {
          this.aiState = 'RETREAT';
        }
      }
    }

    // Execute Current AI Behavior
    switch (this.aiState) {
      case 'APPROACH': {
        const dir = player.x >= this.x ? 1 : -1;
        this.vx = dir * this.speed;
        this.state = 'run';

        // If closed in to attack distance, try attack
        if (dist <= this.preferredDistance + 15 && this.aiAttackCooldown <= 0) {
          this.aiState = 'ATTACK';
        }
        break;
      }

      case 'RETREAT': {
        const awayDir = this.x >= player.x ? 1 : -1;
        this.vx = awayDir * (this.speed * 0.85);
        this.state = 'walk';
        break;
      }

      case 'ATTACK': {
        this.vx = 0;
        if (this.aiAttackCooldown <= 0) {
          const isHeavy = this.isBoss ? (Math.random() < 0.45) : (this.aggression > 0.6 && Math.random() < 0.25);
          this.startAttack(isHeavy);
          this.aiAttackCooldown = this.attackInterval + Math.random() * 0.5;
          // Set next state after attack to retreat or idle
          this.aiState = Math.random() < 0.5 ? 'RETREAT' : 'IDLE';
          this.retreatTimer = 0.4 + Math.random() * 0.3;
        } else {
          this.state = 'idle';
        }
        break;
      }

      case 'IDLE':
      default: {
        this.vx = 0;
        this.state = 'idle';
        break;
      }
    }
  }
}
