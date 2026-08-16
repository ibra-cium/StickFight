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

    // Determine auto-facing when idle/moving
    if (!['attack', 'heavy_attack', 'windup', 'heavy_windup', 'block', 'guard_broken'].includes(this.state)) {
      if (opponent && !opponent.isGrounded && this.isGrounded) {
        // keep current facing
      } else if (opponent) {
        this.facing = opponent.x >= this.x ? 1 : -1;
      }
    }

    // 1. Jump Input (Space / W / ArrowUp)
    if (input.isJustPressed('jump') && this.isGrounded && !['block', 'windup', 'attack', 'heavy_windup', 'heavy_attack', 'guard_broken'].includes(this.state)) {
      this.jump();
    }

    // 2. Attack Input
    if (input.isJustPressed('heavy') || (input.isJustPressed('attack') && !this.isGrounded)) {
      this.startAttack(true); // Heavy attack
      if (!this.isGrounded) {
        this.vx = this.facing * 200; // Aerial downward plunge momentum
      }
      return;
    }

    if (input.isJustPressed('attack')) {
      this.startAttack(false); // Normal attack
      return;
    }

    // 3. Block Input
    if (input.isDown('block')) {
      if (this.isGrounded) {
        this.startBlock();
        this.vx = 0;
        return;
      }
    } else if (this.state === 'block') {
      this.stopBlock();
    }

    // 4. Movement Input (Left / Right)
    if (['windup', 'attack', 'heavy_windup', 'heavy_attack', 'block', 'guard_broken'].includes(this.state)) {
      return;
    }

    const movingLeft = input.isDown('left');
    const movingRight = input.isDown('right');

    if (movingLeft && !movingRight) {
      this.vx = -this.speed;
      if (this.isGrounded) this.state = 'run';
    } else if (movingRight && !movingLeft) {
      this.vx = this.speed;
      if (this.isGrounded) this.state = 'run';
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
