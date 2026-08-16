// Level Configurations & Progression System for 10 Levels and Boss Encounter

import { EnemyAI } from '../entities/EnemyAI.js';

export const LEVEL_CONFIGS = [
  {
    level: 1,
    title: "Page 1: The Novice Scribble",
    enemyName: "Doodle Fighter",
    maxHp: 60,
    attackPower: 8,
    heavyAttackPower: 16,
    speed: 120,
    aggression: 0.25,
    defenseRate: 0.0,
    counterRate: 0.0,
    attackInterval: 2.2,
    scale: 0.95,
    bladeLength: 38,
    bladeWidth: 4,
    color: '#2b2b2b',
    accessory: 'none',
  },
  {
    level: 2,
    title: "Page 2: Quick Sketch",
    enemyName: "Agile Sketch",
    maxHp: 75,
    attackPower: 10,
    heavyAttackPower: 20,
    speed: 145,
    aggression: 0.35,
    defenseRate: 0.0,
    counterRate: 0.0,
    attackInterval: 1.9,
    scale: 0.98,
    bladeLength: 40,
    bladeWidth: 4.2,
    color: '#222',
    accessory: 'none',
  },
  {
    level: 3,
    title: "Page 3: The Shielded Line",
    enemyName: "Iron Guard",
    maxHp: 85,
    attackPower: 12,
    heavyAttackPower: 22,
    speed: 135,
    aggression: 0.35,
    defenseRate: 0.45,
    counterRate: 0.1,
    attackInterval: 1.8,
    scale: 1.0,
    bladeLength: 42,
    bladeWidth: 4.5,
    color: '#1a1a1a',
    accessory: 'none',
  },
  {
    level: 4,
    title: "Page 4: The Wild Scribbler",
    enemyName: "Ink Berserker",
    maxHp: 95,
    attackPower: 15,
    heavyAttackPower: 26,
    speed: 170,
    aggression: 0.7,
    defenseRate: 0.15,
    counterRate: 0.2,
    attackInterval: 1.3,
    scale: 1.05,
    bladeLength: 44,
    bladeWidth: 4.8,
    color: '#151515',
    accessory: 'headband',
  },
  {
    level: 5,
    title: "Page 5: The Broadblade",
    enemyName: "Greatsword Duelist",
    maxHp: 115,
    attackPower: 20,
    heavyAttackPower: 36,
    speed: 130,
    aggression: 0.5,
    defenseRate: 0.35,
    counterRate: 0.2,
    attackInterval: 1.7,
    scale: 1.15,
    bladeLength: 56,
    bladeWidth: 6.5,
    guardWidth: 16,
    color: '#111',
    accessory: 'none',
  },
  {
    level: 6,
    title: "Page 6: The Paper Wall",
    enemyName: "Sentinel",
    maxHp: 125,
    attackPower: 16,
    heavyAttackPower: 28,
    speed: 155,
    aggression: 0.45,
    defenseRate: 0.65,
    counterRate: 0.3,
    attackInterval: 1.5,
    scale: 1.05,
    bladeLength: 46,
    bladeWidth: 4.8,
    color: '#181818',
    accessory: 'none',
  },
  {
    level: 7,
    title: "Page 7: The Counter Striker",
    enemyName: "Shadow Ronin",
    maxHp: 120,
    attackPower: 18,
    heavyAttackPower: 32,
    speed: 180,
    aggression: 0.6,
    defenseRate: 0.55,
    counterRate: 0.6,
    attackInterval: 1.3,
    scale: 1.05,
    bladeLength: 48,
    bladeWidth: 4.5,
    color: '#0d0d0d',
    accessory: 'headband',
  },
  {
    level: 8,
    title: "Page 8: Relentless Tempest",
    enemyName: "Stormblade",
    maxHp: 135,
    attackPower: 20,
    heavyAttackPower: 35,
    speed: 195,
    aggression: 0.8,
    defenseRate: 0.4,
    counterRate: 0.4,
    attackInterval: 1.1,
    scale: 1.08,
    bladeLength: 50,
    bladeWidth: 5.0,
    color: '#080808',
    accessory: 'headband',
  },
  {
    level: 9,
    title: "Page 9: The Master of Ink",
    enemyName: "Grandmaster Kuro",
    maxHp: 150,
    attackPower: 22,
    heavyAttackPower: 40,
    speed: 190,
    aggression: 0.7,
    defenseRate: 0.7,
    counterRate: 0.65,
    attackInterval: 1.2,
    scale: 1.1,
    bladeLength: 52,
    bladeWidth: 5.2,
    color: '#050505',
    accessory: 'headband',
  },
  {
    level: 10,
    title: "Page 10: THE FINAL CLASH",
    enemyName: "THE INK TITAN (BOSS)",
    isBoss: true,
    maxHp: 240,
    attackPower: 28,
    heavyAttackPower: 50,
    speed: 165,
    aggression: 0.85,
    defenseRate: 0.6,
    counterRate: 0.5,
    attackInterval: 1.0,
    scale: 1.45,
    headRadius: 13,
    torsoLength: 48,
    upperArmLength: 25,
    forearmLength: 25,
    upperLegLength: 30,
    lowerLegLength: 30,
    bladeLength: 72,
    bladeWidth: 9.0,
    guardWidth: 22,
    strokeWidth: 4.5,
    color: '#000000',
    accessory: 'boss_horns',
  }
];

export class LevelSystem {
  constructor() {
    this.currentLevel = 1;
    this.unlockedLevel = 1;
    this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('notebook_duel_unlocked');
      if (saved) {
        this.unlockedLevel = Math.max(1, Math.min(10, parseInt(saved, 10)));
      }
    } catch (e) {
      // Storage unavailable
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('notebook_duel_unlocked', String(this.unlockedLevel));
    } catch (e) {}
  }

  unlockNextLevel() {
    if (this.currentLevel >= this.unlockedLevel && this.unlockedLevel < 10) {
      this.unlockedLevel = this.currentLevel + 1;
      this.saveProgress();
    }
  }

  getCurrentConfig() {
    return LEVEL_CONFIGS[this.currentLevel - 1] || LEVEL_CONFIGS[0];
  }

  createEnemyForCurrentLevel() {
    const config = this.getCurrentConfig();
    return new EnemyAI(config.enemyName, {
      ...config,
      x: 180,
      facing: -1,
    });
  }
}
