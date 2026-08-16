// Procedural Stickman Skeleton & Dynamic Inverse Kinematics / Forward Kinematics

import { renderer } from '../graphics/NotebookRenderer.js';

export class Skeleton {
  constructor(config = {}) {
    // Configurable proportions
    this.scale = config.scale || 1.0;
    this.headRadius = (config.headRadius || 11) * this.scale;
    this.torsoLength = (config.torsoLength || 38) * this.scale;
    this.upperArmLength = (config.upperArmLength || 18) * this.scale;
    this.forearmLength = (config.forearmLength || 18) * this.scale;
    this.upperLegLength = (config.upperLegLength || 22) * this.scale;
    this.lowerLegLength = (config.lowerLegLength || 22) * this.scale;
    this.strokeWidth = config.strokeWidth || 3.0;
    this.color = config.color || '#161616';
    this.isBoss = !!config.isBoss;

    // Sword dimensions
    this.bladeLength = (config.bladeLength || 44) * this.scale;
    this.bladeWidth = (config.bladeWidth || 4.5) * this.scale;
    this.guardWidth = (config.guardWidth || 12) * this.scale;
    this.handleLength = (config.handleLength || 10) * this.scale;

    // Head accessories (headband, crown for boss, samurai topknot, etc.)
    this.accessory = config.accessory || (this.isBoss ? 'boss_horns' : 'headband');

    // Joint Angles (in radians)
    this.angles = {
      torso: 0,
      head: 0,
      leftShoulder: 0.3,
      leftElbow: 0.5,
      rightShoulder: -0.6,
      rightElbow: -0.8,
      leftHip: 0.2,
      leftKnee: 0.2,
      rightHip: -0.2,
      rightKnee: 0.2,
      swordAngle: -0.4,
    };
    this.targetAngles = { ...this.angles };

    // Computed World Positions of key joints for collision & sword trail
    this.joints = {
      hips: { x: 0, y: 0 },
      chest: { x: 0, y: 0 },
      head: { x: 0, y: 0 },
      leftHand: { x: 0, y: 0 },
      rightHand: { x: 0, y: 0 },
      leftFoot: { x: 0, y: 0 },
      rightFoot: { x: 0, y: 0 },
      swordHilt: { x: 0, y: 0 },
      swordTip: { x: 0, y: 0 },
    };
  }

  // Calculate forward kinematics joint positions
  computeJoints(rootX, rootY, facing = 1, seed = 0, squash = 1) {
    const f = facing; // 1 = facing right, -1 = facing left
    const sx = 2 - squash;
    const sy = squash;

    // Hips / Root
    this.joints.hips = { x: rootX, y: rootY };

    // Torso -> Chest
    const torsoAngle = this.angles.torso * f;
    const chestX = rootX + Math.sin(torsoAngle) * this.torsoLength * sx;
    const chestY = rootY - Math.cos(torsoAngle) * this.torsoLength * sy;
    this.joints.chest = { x: chestX, y: chestY };

    // Neck -> Head
    const headAngle = torsoAngle + this.angles.head * f;
    const headX = chestX + Math.sin(headAngle) * (this.headRadius * 1.3) * sx;
    const headY = chestY - Math.cos(headAngle) * (this.headRadius * 1.3) * sy;
    this.joints.head = { x: headX, y: headY };

    // Right Arm (Weapon Arm - Primary)
    const rShoulderAngle = torsoAngle + this.angles.rightShoulder * f;
    const rElbowX = chestX + Math.sin(rShoulderAngle) * this.upperArmLength * sx;
    const rElbowY = chestY + Math.cos(rShoulderAngle) * this.upperArmLength * sy;

    const rElbowAngle = rShoulderAngle + this.angles.rightElbow * f;
    const rHandX = rElbowX + Math.sin(rElbowAngle) * this.forearmLength * sx;
    const rHandY = rElbowY + Math.cos(rElbowAngle) * this.forearmLength * sy;
    this.joints.rightHand = { x: rHandX, y: rHandY };

    // Left Arm (Off hand / support)
    const lShoulderAngle = torsoAngle + this.angles.leftShoulder * f;
    const lElbowX = chestX + Math.sin(lShoulderAngle) * this.upperArmLength * sx;
    const lElbowY = chestY + Math.cos(lShoulderAngle) * this.upperArmLength * sy;

    const lElbowAngle = lShoulderAngle + this.angles.leftElbow * f;
    const lHandX = lElbowX + Math.sin(lElbowAngle) * this.forearmLength * sx;
    const lHandY = lElbowY + Math.cos(lElbowAngle) * this.forearmLength * sy;
    this.joints.leftHand = { x: lHandX, y: lHandY };

    // Right Leg (Back / Front depending on stance)
    const rHipAngle = this.angles.rightHip * f;
    const rKneeX = rootX + Math.sin(rHipAngle) * this.upperLegLength * sx;
    const rKneeY = rootY + Math.cos(rHipAngle) * this.upperLegLength * sy;

    const rKneeAngle = rHipAngle + this.angles.rightKnee * f;
    const rFootX = rKneeX + Math.sin(rKneeAngle) * this.lowerLegLength * sx;
    const rFootY = rKneeY + Math.cos(rKneeAngle) * this.lowerLegLength * sy;
    this.joints.rightFoot = { x: rFootX, y: rFootY };

    // Left Leg
    const lHipAngle = this.angles.leftHip * f;
    const lKneeX = rootX + Math.sin(lHipAngle) * this.upperLegLength * sx;
    const lKneeY = rootY + Math.cos(lHipAngle) * this.upperLegLength * sy;

    const lKneeAngle = lHipAngle + this.angles.leftKnee * f;
    const lFootX = lKneeX + Math.sin(lKneeAngle) * this.lowerLegLength * sx;
    const lFootY = lKneeY + Math.cos(lKneeAngle) * this.lowerLegLength * sy;
    this.joints.leftFoot = { x: lFootX, y: lFootY };

    // Sword (attached to Right Hand)
    const swordAbsAngle = rElbowAngle + this.angles.swordAngle * f;
    this.joints.swordHilt = { x: rHandX, y: rHandY };
    this.joints.swordTip = {
      x: rHandX + Math.sin(swordAbsAngle) * this.bladeLength,
      y: rHandY - Math.cos(swordAbsAngle) * this.bladeLength,
    };

    return {
      chestX, chestY, headX, headY,
      rElbowX, rElbowY, rHandX, rHandY,
      lElbowX, lElbowY, lHandX, lHandY,
      rKneeX, rKneeY, rFootX, rFootY,
      lKneeX, lKneeY, lFootX, lFootY,
      swordAbsAngle,
    };
  }

  // Draw the entire procedural stickman and sword
  draw(ctx, rootX, rootY, facing = 1, seed = 0, isHurt = false, squash = 1) {
    const k = this.computeJoints(rootX, rootY, facing, seed, squash);
    const color = isHurt ? '#b71c1c' : this.color;
    const strokeW = this.strokeWidth;

    ctx.save();

    // 1. Back Arm (Left Arm)
    renderer.sketchLine(ctx, k.chestX, k.chestY, k.lElbowX, k.lElbowY, {
      color, width: strokeW * 0.85, roughness: 1.2, seed: seed + 1,
    });
    renderer.sketchLine(ctx, k.lElbowX, k.lElbowY, k.lHandX, k.lHandY, {
      color, width: strokeW * 0.85, roughness: 1.2, seed: seed + 2,
    });

    // 2. Back Leg (Left Leg)
    renderer.sketchLine(ctx, rootX, rootY, k.lKneeX, k.lKneeY, {
      color, width: strokeW * 0.9, roughness: 1.2, seed: seed + 3,
    });
    renderer.sketchLine(ctx, k.lKneeX, k.lKneeY, k.lFootX, k.lFootY, {
      color, width: strokeW * 0.9, roughness: 1.2, seed: seed + 4,
    });
    // Foot line
    renderer.sketchLine(ctx, k.lFootX, k.lFootY, k.lFootX + facing * 8, k.lFootY, {
      color, width: strokeW * 0.8, roughness: 1.0, seed: seed + 5,
    });

    // 3. Torso (Spine)
    renderer.sketchLine(ctx, rootX, rootY, k.chestX, k.chestY, {
      color, width: strokeW * 1.2, roughness: 1.4, passes: 2, seed: seed + 6,
    });

    // 4. Front Leg (Right Leg)
    renderer.sketchLine(ctx, rootX, rootY, k.rKneeX, k.rKneeY, {
      color, width: strokeW * 1.05, roughness: 1.2, seed: seed + 7,
    });
    renderer.sketchLine(ctx, k.rKneeX, k.rKneeY, k.rFootX, k.rFootY, {
      color, width: strokeW * 1.05, roughness: 1.2, seed: seed + 8,
    });
    // Foot line
    renderer.sketchLine(ctx, k.rFootX, k.rFootY, k.rFootX + facing * 9, k.rFootY, {
      color, width: strokeW * 0.9, roughness: 1.0, seed: seed + 9,
    });

    // 5. Head
    renderer.sketchCircle(ctx, k.headX, k.headY, this.headRadius, {
      color,
      fill: isHurt ? 'rgba(255, 200, 200, 0.4)' : '#fbf8eb',
      width: strokeW * 1.1,
      roughness: 1.3,
      seed: seed + 10,
    });

    // Sketched Stickman Face / Eye
    const eyeX = k.headX + facing * (this.headRadius * 0.45);
    const eyeY = k.headY - this.headRadius * 0.1;
    renderer.sketchCircle(ctx, eyeX, eyeY, 1.8 * this.scale, {
      color, fill: color, width: 1.2, seed: seed + 11,
    });

    // Head Accessories (Headband tail / Boss Horns / Samurai bun)
    if (this.accessory === 'headband') {
      const hbBackX = k.headX - facing * this.headRadius;
      const hbBackY = k.headY;
      const tailX = hbBackX - facing * 18;
      const tailY = hbBackY + 6;
      renderer.sketchLine(ctx, hbBackX, hbBackY, tailX, tailY, {
        color: '#c62828', width: 2.2, seed: seed + 12,
      });
      renderer.sketchLine(ctx, hbBackX, hbBackY, tailX - facing * 4, tailY + 8, {
        color: '#c62828', width: 1.8, seed: seed + 13,
      });
    } else if (this.accessory === 'boss_horns') {
      // Intimidating sketched demon horns for boss
      const h1X = k.headX - 10;
      const h2X = k.headX + 10;
      const topY = k.headY - this.headRadius - 16;
      renderer.sketchPoly(ctx, [
        { x: h1X, y: k.headY - this.headRadius + 2 },
        { x: h1X - 8, y: topY },
        { x: h1X + 4, y: k.headY - this.headRadius + 4 },
      ], { color: '#000', fill: '#000', width: 2, seed: seed + 14 });
      renderer.sketchPoly(ctx, [
        { x: h2X, y: k.headY - this.headRadius + 2 },
        { x: h2X + 8, y: topY },
        { x: h2X - 4, y: k.headY - this.headRadius + 4 },
      ], { color: '#000', fill: '#000', width: 2, seed: seed + 15 });
    }

    // 6. Front Arm (Right Arm)
    renderer.sketchLine(ctx, k.chestX, k.chestY, k.rElbowX, k.rElbowY, {
      color, width: strokeW, roughness: 1.2, seed: seed + 16,
    });
    renderer.sketchLine(ctx, k.rElbowX, k.rElbowY, k.rHandX, k.rHandY, {
      color, width: strokeW, roughness: 1.2, seed: seed + 17,
    });

    // 7. Sword Drawing
    this.drawSword(ctx, k.rHandX, k.rHandY, k.swordAbsAngle, facing, seed + 18, color);

    ctx.restore();
  }

  // Procedurally render Sword (Blade, Guard, Grip, Pommel)
  drawSword(ctx, hiltX, hiltY, angle, facing, seed, color) {
    ctx.save();
    ctx.translate(hiltX, hiltY);
    ctx.rotate(angle);

    const len = this.bladeLength;
    const halfW = this.bladeWidth / 2;
    const gW = this.guardWidth / 2;
    const hL = this.handleLength;

    // Handle / Grip
    renderer.sketchLine(ctx, 0, 0, 0, hL, {
      color: '#422817',
      width: 2.8 * this.scale,
      roughness: 0.8,
      seed: seed + 1,
    });

    // Pommel (end knob)
    renderer.sketchCircle(ctx, 0, hL, 2.5 * this.scale, {
      color: '#1a1a1a',
      fill: '#1a1a1a',
      width: 1.2,
      seed: seed + 2,
    });

    // Crossguard
    renderer.sketchPoly(ctx, [
      { x: -gW, y: -1 },
      { x: gW, y: -1 },
      { x: gW, y: 3 },
      { x: -gW, y: 3 },
    ], {
      color: '#1a1a1a',
      fill: '#222',
      width: 1.5,
      seed: seed + 3,
    });

    // Sword Blade (Double edged tapered blade with sharp tip)
    const bladePts = [
      { x: -halfW, y: 0 },
      { x: -halfW * 0.85, y: -len * 0.85 },
      { x: 0, y: -len }, // Pointy tip
      { x: halfW * 0.85, y: -len * 0.85 },
      { x: halfW, y: 0 },
    ];

    renderer.sketchPoly(ctx, bladePts, {
      color: '#1a1a1a',
      fill: '#fbf8eb',
      width: 1.8 * this.scale,
      roughness: 1.1,
      seed: seed + 4,
    });

    // Blade Central Fuller / Ridge Line
    renderer.sketchLine(ctx, 0, -2, 0, -len * 0.8, {
      color: '#555',
      width: 1.0 * this.scale,
      roughness: 0.6,
      seed: seed + 5,
    });

    ctx.restore();
  }
}
