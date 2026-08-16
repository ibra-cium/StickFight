// Player Controller handling Input, Movement, Combos, and Actions

import { Fighter } from './Fighter.js';

export class Player extends Fighter {
  constructor(config = {}) {
    super('Player', {
      isPlayer: true,
      maxHp: 100,
      attackPower: 18,
      heavyAttackPower: 35,
      speed: 185,
      color: '#111111',
      accessory: 'headband',
      scale: 1.0,
      ...config,
    });
  }

  handleInput(input, opponent) {
    if (['dead', 'hit', 'knockback', 'victory', 'guard_broken'].includes(this.state)) return;

    // Determine auto-facing when idle/moving/crouching
    if (!['attack', 'heavy_attack', 'windup', 'heavy_windup', 'block', 'guard_broken', 'dash'].includes(this.state)) {
      if (opponent && !opponent.isGrounded && this.isGrounded) {
        // keep current facing
      } else if (opponent) {
        this.facing = opponent.x >= this.x ? 1 : -1;
      }
    }

    // 1. Dash Input (Double tap right or E/F on keyboard)
    if (input.isJustPressed('dash') && this.isGrounded && !['block', 'windup', 'attack', 'heavy_windup', 'heavy_attack', 'guard_broken', 'dash'].includes(this.state)) {
      input.consume('dash');
      const dashDir = Math.abs(input.axisX) > 0.2 ? Math.sign(input.axisX) : this.facing;
      this.dash(dashDir);
      return;
    }

    // 2. Jump Input (Space / W / ArrowUp / Flick Up)
    if (input.isJustPressed('jump') && this.isGrounded && !['block', 'windup', 'attack', 'heavy_windup', 'heavy_attack', 'guard_broken', 'dash'].includes(this.state)) {
      this.jump();
    }

    // 3. Heavy Attack Input
    if (input.isJustPressed('heavy') || (input.isJustPressed('attack') && !this.isGrounded)) {
      const isAerial = !this.isGrounded;
      const variant = isAerial ? 'overhead' : (input.heavyVariant || 'overhead');
      const started = this.startAttack(true, variant);
      if (started) {
        input.consume('heavy');
        input.consume('attack');
        if (isAerial) {
          this.vx = this.facing * 200; // Aerial downward plunge momentum
        }
        return;
      }
    }

    // 4. Normal Light Attack Input
    if (input.isJustPressed('attack')) {
      const started = this.startAttack(false);
      if (started) {
        input.consume('attack');
        return;
      }
    }

    // 5. Block Input
    if (input.isDown('block')) {
      if (this.isGrounded) {
        this.startBlock();
        this.vx = 0;
        return;
      }
    } else if (this.state === 'block') {
      this.stopBlock();
    }

    // 6. Crouch Input
    if (input.isDown('crouch') && this.isGrounded) {
      if (!['windup', 'attack', 'heavy_windup', 'heavy_attack', 'block', 'guard_broken', 'dash'].includes(this.state)) {
        this.state = 'crouch';
        this.vx = 0;
        return;
      }
    } else if (this.state === 'crouch') {
      this.state = 'idle';
    }

    // 7. Movement Input via axisX
    if (['windup', 'attack', 'heavy_windup', 'heavy_attack', 'block', 'guard_broken', 'dash', 'crouch'].includes(this.state)) {
      return;
    }

    const axisX = input.axisX || 0;
    const absAxis = Math.abs(axisX);

    if (absAxis >= 0.2) {
      this.vx = this.speed * axisX;
      if (this.isGrounded) {
        if (absAxis > 0.55) {
          this.state = 'run';
        } else {
          this.state = 'walk';
        }
      }
    } else {
      if (this.isGrounded) {
        if (this.state === 'run' || this.state === 'walk') {
          this.state = 'idle';
        }
        this.vx = 0;
      }
    }
  }
}
