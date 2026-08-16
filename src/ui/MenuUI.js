// Hand-Drawn Notebook Menus: Title Screen, Level Select, Victory, and Game Over

import { renderer } from '../graphics/NotebookRenderer.js';
import { LEVEL_CONFIGS } from '../systems/LevelSystem.js';
import { sound } from '../core/Audio.js';

export class MenuUI {
  constructor(game) {
    this.game = game;
    this.buttons = []; // [{ id, x, y, w, h, text, onClick, color, subtext, isLocked }]
    this.hoverBtn = null;
    this.doodleTimer = 0;

    this.initMouseEvents();
  }

  initMouseEvents() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('pointermove', (e) => {
      if (this.game.state === 'playing') return;
      const pos = getCanvasPos(e);
      this.hoverBtn = this.buttons.find(b =>
        pos.x >= b.x && pos.x <= b.x + b.w &&
        pos.y >= b.y && pos.y <= b.y + b.h &&
        !b.isLocked
      );
      canvas.style.cursor = this.hoverBtn ? 'pointer' : 'default';
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (this.game.state === 'playing') return;
      const pos = getCanvasPos(e);
      const clicked = this.buttons.find(b =>
        pos.x >= b.x && pos.x <= b.x + b.w &&
        pos.y >= b.y && pos.y <= b.y + b.h &&
        !b.isLocked
      );
      if (clicked) {
        sound.ensureContext();
        sound.playSwing(false);
        clicked.onClick();
      }
    });
  }

  update(dt = 1 / 60) {
    this.doodleTimer += dt;
  }

  draw(ctx, width, height) {
    this.buttons = [];
    ctx.save();

    switch (this.game.state) {
      case 'title':
        this.drawTitleScreen(ctx, width, height);
        break;
      case 'level_select':
        this.drawLevelSelectScreen(ctx, width, height);
        break;
      case 'victory_screen':
        this.drawVictoryScreen(ctx, width, height);
        break;
      case 'gameover_screen':
        this.drawGameOverScreen(ctx, width, height);
        break;
      case 'game_complete':
        this.drawGameCompleteScreen(ctx, width, height);
        break;
    }

    // Draw Audio Mute/Unmute in corner
    this.drawSoundToggle(ctx, width, height);

    ctx.restore();
  }

  drawButton(ctx, btn) {
    this.buttons.push(btn);
    const isHover = (this.hoverBtn === btn);
    const { x, y, w, h, text, color = '#1a1a1a', isLocked = false, subtext = '' } = btn;

    ctx.save();
    // Sketched Button Box
    renderer.sketchBox(ctx, x, y, w, h, {
      fill: isHover ? 'rgba(235, 230, 210, 0.95)' : 'rgba(251, 248, 235, 0.9)',
      color: isLocked ? '#999' : (isHover ? '#8b0000' : color),
      width: isHover ? 2.8 : 2.0,
      seed: x + y,
    });

    if (isHover && !isLocked) {
      // Little action dash marks around button
      renderer.sketchLine(ctx, x - 10, y + h / 2, x - 2, y + h / 2, { color: '#8b0000', width: 2, seed: 1 });
      renderer.sketchLine(ctx, x + w + 2, y + h / 2, x + w + 10, y + h / 2, { color: '#8b0000', width: 2, seed: 2 });
    }

    // Main Text
    renderer.sketchText(ctx, text, x + w / 2, y + (subtext ? h * 0.38 : h / 2) + 1, {
      font: `bold ${h > 50 ? '22px' : '17px'} 'Permanent Marker', cursive`,
      color: isLocked ? '#888' : (isHover ? '#8b0000' : color),
      align: 'center',
      seed: x,
    });

    // Subtext (if any)
    if (subtext) {
      renderer.sketchText(ctx, subtext, x + w / 2, y + h * 0.74, {
        font: "13px 'Architects Daughter', cursive",
        color: isLocked ? '#aaa' : '#555',
        align: 'center',
        seed: y,
      });
    }

    ctx.restore();
  }

  drawTitleScreen(ctx, width, height) {
    // Notebook Title Box
    const titleBoxW = Math.min(540, width * 0.85);
    const titleBoxH = 140;
    const bx = width / 2 - titleBoxW / 2;
    const by = height * 0.12;

    renderer.sketchBox(ctx, bx, by, titleBoxW, titleBoxH, {
      fill: 'rgba(255, 255, 255, 0.65)',
      color: '#111',
      width: 3.2,
      seed: 10,
    });

    // Main Title
    renderer.sketchText(ctx, "NOTEBOOK DUEL", width / 2, by + 48, {
      font: "bold 44px 'Permanent Marker', cursive",
      color: '#111',
      align: 'center',
      seed: 11,
    });

    // Subtitle
    renderer.sketchText(ctx, "— Draw. Fight. Survive. —", width / 2, by + 98, {
      font: "bold 20px 'Caveat', cursive",
      color: '#c62828',
      align: 'center',
      seed: 12,
    });

    // Animated stickman preview doodles in center
    this.drawTitleDoodle(ctx, width / 2, height * 0.55);

    // Controls hints
    renderer.sketchText(ctx, "Controls: A/D: Move  |  Space: Jump  |  Left Click: Attack  |  Right Click: Heavy  |  Shift: Block", width / 2, height * 0.72, {
      font: "15px 'Architects Daughter', cursive",
      color: '#444',
      align: 'center',
      seed: 13,
    });

    // Main Menu Action Buttons
    const btnW = 200;
    const btnH = 50;
    this.drawButton(ctx, {
      id: 'btn_play',
      x: width / 2 - btnW - 12,
      y: height * 0.80,
      w: btnW,
      h: btnH,
      text: "START DUEL",
      onClick: () => this.game.startLevel(this.game.levelSystem.unlockedLevel),
    });

    this.drawButton(ctx, {
      id: 'btn_levels',
      x: width / 2 + 12,
      y: height * 0.80,
      w: btnW,
      h: btnH,
      text: "LEVEL SELECT",
      onClick: () => this.game.setState('level_select'),
    });
  }

  drawTitleDoodle(ctx, cx, cy) {
    ctx.save();
    const bob = Math.sin(this.doodleTimer * 4) * 4;

    // Player sketch
    renderer.sketchCircle(ctx, cx - 70, cy - 35 + bob, 11, { color: '#111', width: 2.2, seed: 1 });
    renderer.sketchLine(ctx, cx - 70, cy - 24 + bob, cx - 70, cy + 12 + bob, { color: '#111', width: 2.5, seed: 2 });
    renderer.sketchLine(ctx, cx - 70, cy + 12 + bob, cx - 85, cy + 38, { color: '#111', width: 2.2, seed: 3 });
    renderer.sketchLine(ctx, cx - 70, cy + 12 + bob, cx - 55, cy + 38, { color: '#111', width: 2.2, seed: 4 });
    // Headband
    renderer.sketchLine(ctx, cx - 81, cy - 35 + bob, cx - 100, cy - 28 + bob, { color: '#c62828', width: 2, seed: 5 });
    // Sword
    renderer.sketchLine(ctx, cx - 70, cy - 10 + bob, cx - 25, cy - 30 + bob, { color: '#111', width: 3, seed: 6 });

    // "VS" Doodle
    renderer.sketchText(ctx, "VS", cx, cy + bob, {
      font: "bold 26px 'Permanent Marker', cursive",
      color: '#b71c1c',
      align: 'center',
      seed: 7,
    });

    // Enemy sketch
    renderer.sketchCircle(ctx, cx + 70, cy - 35 - bob, 11, { color: '#111', width: 2.2, seed: 8 });
    renderer.sketchLine(ctx, cx + 70, cy - 24 - bob, cx + 70, cy + 12 - bob, { color: '#111', width: 2.5, seed: 9 });
    renderer.sketchLine(ctx, cx + 70, cy + 12 - bob, cx + 55, cy + 38, { color: '#111', width: 2.2, seed: 10 });
    renderer.sketchLine(ctx, cx + 70, cy + 12 - bob, cx + 85, cy + 38, { color: '#111', width: 2.2, seed: 11 });
    // Sword
    renderer.sketchLine(ctx, cx + 70, cy - 10 - bob, cx + 25, cy - 30 - bob, { color: '#111', width: 3, seed: 12 });

    // Ground sketch
    renderer.sketchLine(ctx, cx - 140, cy + 40, cx + 140, cy + 40, { color: '#222', width: 2.0, seed: 13 });
    ctx.restore();
  }

  drawLevelSelectScreen(ctx, width, height) {
    renderer.sketchText(ctx, "SELECT NOTEBOOK PAGE", width / 2, 45, {
      font: "bold 32px 'Permanent Marker', cursive",
      color: '#111',
      align: 'center',
      seed: 20,
    });

    const cols = 5;
    const rows = 2;
    const boxW = Math.min(130, width * 0.16);
    const boxH = 75;
    const gapX = 16;
    const gapY = 20;
    const totalW = cols * boxW + (cols - 1) * gapX;
    const startX = width / 2 - totalW / 2;
    const startY = height * 0.24;

    for (let i = 0; i < 10; i++) {
      const lvl = i + 1;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (boxW + gapX);
      const by = startY + row * (boxH + gapY);
      const isLocked = lvl > this.game.levelSystem.unlockedLevel;
      const isBoss = (lvl === 10);
      const cfg = LEVEL_CONFIGS[i];

      this.drawButton(ctx, {
        id: `lvl_${lvl}`,
        x: bx,
        y: by,
        w: boxW,
        h: boxH,
        text: isLocked ? "🔒 LOCKED" : (isBoss ? "👑 BOSS" : `PAGE ${lvl}`),
        subtext: isLocked ? "" : (isBoss ? "THE INK TITAN" : cfg.enemyName),
        isLocked,
        color: isBoss ? '#8b0000' : '#111',
        onClick: () => this.game.startLevel(lvl),
      });
    }

    // Back to menu button
    const backW = 160;
    const backH = 45;
    this.drawButton(ctx, {
      id: 'btn_back',
      x: width / 2 - backW / 2,
      y: height * 0.82,
      w: backW,
      h: backH,
      text: "◀ MAIN MENU",
      onClick: () => this.game.setState('title'),
    });
  }

  drawVictoryScreen(ctx, width, height) {
    const boxW = Math.min(480, width * 0.82);
    const boxH = 240;
    const bx = width / 2 - boxW / 2;
    const by = height * 0.22;

    renderer.sketchBox(ctx, bx, by, boxW, boxH, {
      fill: '#fbf8eb',
      color: '#1b5e20',
      width: 3.0,
      seed: 30,
    });

    renderer.sketchText(ctx, "LEVEL COMPLETE!", width / 2, by + 48, {
      font: "bold 34px 'Permanent Marker', cursive",
      color: '#1b5e20',
      align: 'center',
      seed: 31,
    });

    renderer.sketchText(ctx, `Defeated ${this.game.levelSystem.getCurrentConfig().enemyName}!`, width / 2, by + 88, {
      font: "19px 'Architects Daughter', cursive",
      color: '#333',
      align: 'center',
      seed: 32,
    });

    // Action buttons
    const btnW = 180;
    const btnH = 48;
    const nextLvl = this.game.levelSystem.currentLevel + 1;

    if (nextLvl <= 10) {
      this.drawButton(ctx, {
        id: 'btn_next',
        x: width / 2 - btnW - 10,
        y: by + 145,
        w: btnW,
        h: btnH,
        text: `NEXT PAGE ➔`,
        color: '#1b5e20',
        onClick: () => this.game.startLevel(nextLvl),
      });
    } else {
      this.drawButton(ctx, {
        id: 'btn_grand_win',
        x: width / 2 - btnW - 10,
        y: by + 145,
        w: btnW,
        h: btnH,
        text: `VICTORY! 👑`,
        color: '#8b0000',
        onClick: () => this.game.setState('game_complete'),
      });
    }

    this.drawButton(ctx, {
      id: 'btn_menu',
      x: width / 2 + 10,
      y: by + 145,
      w: btnW,
      h: btnH,
      text: "LEVEL SELECT",
      onClick: () => this.game.setState('level_select'),
    });
  }

  drawGameOverScreen(ctx, width, height) {
    const boxW = Math.min(460, width * 0.82);
    const boxH = 230;
    const bx = width / 2 - boxW / 2;
    const by = height * 0.22;

    renderer.sketchBox(ctx, bx, by, boxW, boxH, {
      fill: '#fbf8eb',
      color: '#b71c1c',
      width: 3.0,
      seed: 40,
    });

    renderer.sketchText(ctx, "TRY AGAIN", width / 2, by + 48, {
      font: "bold 36px 'Permanent Marker', cursive",
      color: '#b71c1c',
      align: 'center',
      seed: 41,
    });

    renderer.sketchText(ctx, "Your ink faded this time...", width / 2, by + 88, {
      font: "18px 'Architects Daughter', cursive",
      color: '#444',
      align: 'center',
      seed: 42,
    });

    const btnW = 170;
    const btnH = 48;

    this.drawButton(ctx, {
      id: 'btn_retry',
      x: width / 2 - btnW - 10,
      y: by + 140,
      w: btnW,
      h: btnH,
      text: "RETRY ⚔",
      color: '#b71c1c',
      onClick: () => this.game.startLevel(this.game.levelSystem.currentLevel),
    });

    this.drawButton(ctx, {
      id: 'btn_menu_fail',
      x: width / 2 + 10,
      y: by + 140,
      w: btnW,
      h: btnH,
      text: "LEVEL SELECT",
      onClick: () => this.game.setState('level_select'),
    });
  }

  drawGameCompleteScreen(ctx, width, height) {
    const boxW = Math.min(560, width * 0.88);
    const boxH = 300;
    const bx = width / 2 - boxW / 2;
    const by = height * 0.18;

    renderer.sketchBox(ctx, bx, by, boxW, boxH, {
      fill: '#fbf8eb',
      color: '#8b0000',
      width: 3.6,
      seed: 50,
    });

    renderer.sketchText(ctx, "YOU WIN!", width / 2, by + 50, {
      font: "bold 48px 'Permanent Marker', cursive",
      color: '#8b0000',
      align: 'center',
      seed: 51,
    });

    renderer.sketchText(ctx, "★ MASTER OF THE NOTEBOOK ★", width / 2, by + 98, {
      font: "bold 22px 'Caveat', cursive",
      color: '#111',
      align: 'center',
      seed: 52,
    });

    renderer.sketchText(ctx, "You defeated the Ink Titan and conquered all 10 pages!", width / 2, by + 140, {
      font: "18px 'Architects Daughter', cursive",
      color: '#333',
      align: 'center',
      seed: 53,
    });

    const btnW = 200;
    const btnH = 50;

    this.drawButton(ctx, {
      id: 'btn_complete_menu',
      x: width / 2 - btnW / 2,
      y: by + 200,
      w: btnW,
      h: btnH,
      text: "MAIN MENU 🏆",
      onClick: () => this.game.setState('title'),
    });
  }

  drawSoundToggle(ctx, width, height) {
    const icon = sound.enabled ? "🔊 AUDIO ON" : "🔇 AUDIO OFF";
    this.drawButton(ctx, {
      id: 'btn_sound',
      x: width - 130,
      y: height - 42,
      w: 118,
      h: 30,
      text: icon,
      color: '#555',
      onClick: () => {
        sound.enabled = !sound.enabled;
        if (sound.enabled) sound.ensureContext();
        else sound.setRainIntensity(0);
      },
    });
  }
}
