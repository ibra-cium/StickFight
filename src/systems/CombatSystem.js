// Combat & Hit Detection Engine (Blade Line vs Hurtbox Circle collision, Parry & Knockback)

export class CombatSystem {
  constructor(camera) {
    this.camera = camera;
  }

  // Distance from point to line segment
  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projX, p.y - projY);
  }

  checkHit(attacker, defender) {
    if (!['attack', 'heavy_attack'].includes(attacker.state)) return;
    if (attacker.hasHitThisSwing) return;
    if (defender.state === 'dead' || defender.invulnerableTimer > 0) return;

    // Get attacker's sword line segment
    const sword = attacker.getSwordSegment();
    // Get defender's hurtbox
    const hurtbox = defender.getHurtbox();

    // Check collision between sword line segment and defender hurtbox circle
    const dist = this.distToSegment(hurtbox, sword.p1, sword.p2);

    if (dist <= hurtbox.radius + 10) {
      attacker.hasHitThisSwing = true;
      const isHeavy = attacker.state === 'heavy_attack';
      const power = isHeavy ? attacker.heavyAttackPower : attacker.attackPower;
      const knockback = isHeavy ? 320 : 190;

      const result = defender.takeDamage(power, knockback, attacker.x, isHeavy);

      if (result.type === 'parry') {
        // Attacker gets staggered by the parry!
        attacker.state = 'hit';
        attacker.stateTimer = 0;
        attacker.vx = -attacker.facing * 180;
        attacker.attackCooldown = 0.5;
        this.camera.shake(9);
        this.camera.hitstop(4);
      } else if (result.type === 'block') {
        this.camera.shake(4);
        this.camera.hitstop(2);
      } else if (result.type === 'hit' || result.type === 'death') {
        this.camera.shake(isHeavy ? 14 : 7);
        this.camera.hitstop(isHeavy ? 5 : 3);
      }
    }
  }

  update(player, enemy) {
    if (!player || !enemy) return;
    this.checkHit(player, enemy);
    this.checkHit(enemy, player);
  }
}
