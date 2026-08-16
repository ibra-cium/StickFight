// Hand-Drawn Pencil HUD (Health Bars, Level Header, Announcer Banners)

import { renderer } from '../graphics/NotebookRenderer.js?v=4';

export class HUD {
  constructor() {
    this.bannerText = '';
    this.bannerSubtext = '';
    this.bannerTimer = 0;
    this.bannerColor = '#1a1a1a';
  }

  showBanner(text, subtext = '', duration = 2.0, color = '#1a1a1a') {
    this.bannerText = text;
    this.bannerSubtext = subtext;
    this.bannerTimer = duration;
    this.bannerColor = color;
  }

  update(dt = 1 / 60) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }
  }

  draw(ctx, width, height, player, enemy, levelConfig) {
    ctx.save();

    const barW = Math.min(240, width * 0.32);
    const barH = 18;
    const topMargin = 22;

    // 1. Player Health Bar (Left)
    if (player) {
      const pLeft = 32;
      const pRatio = Math.max(0, player.hp / player.maxHp);

      // Label
      renderer.sketchText(ctx, "PLAYER", pLeft, topMargin - 4, {
        font: "bold 16px 'Permanent Marker', cursive",
        color: '#1a1a1a',
        align: 'left',
        seed: 1,
      });

      // Outline Box
      renderer.sketchBox(ctx, pLeft, topMargin, barW, barH, {
        color: '#1a1a1a',
        width: 2.2,
        seed: 2,
      });

      // Filled Graphite / Ink Bar
      if (pRatio > 0) {
        const fillW = (barW - 4) * pRatio;
        renderer.sketchHatch(ctx, pLeft + 2, topMargin + 2, fillW, barH - 4, 45, 6, '#1a1a1a');
      }

      // Numeric HP
      renderer.sketchText(ctx, `${Math.ceil(player.hp)} / ${player.maxHp}`, pLeft + barW + 12, topMargin + barH / 2 + 1, {
        font: "14px 'Architects Daughter', cursive",
        color: '#333',
        align: 'left',
        seed: 3,
      });
    }

    // 2. Enemy Health Bar (Right)
    if (enemy) {
      const eRight = width - 32;
      const eLeft = eRight - barW;
      const eRatio = Math.max(0, enemy.hp / enemy.maxHp);

      // Enemy Name / Boss Tag
      const nameTag = enemy.isBoss ? `★ ${enemy.name} ★` : enemy.name.toUpperCase();
      renderer.sketchText(ctx, nameTag, eRight, topMargin - 4, {
        font: `bold ${enemy.isBoss ? '16px' : '15px'} 'Permanent Marker', cursive`,
        color: enemy.isBoss ? '#8b0000' : '#1a1a1a',
        align: 'right',
        seed: 4,
      });

      // Outline Box
      renderer.sketchBox(ctx, eLeft, topMargin, barW, barH, {
        color: enemy.isBoss ? '#8b0000' : '#1a1a1a',
        width: enemy.isBoss ? 2.8 : 2.2,
        seed: 5,
      });

      // Filled Hatch Bar
      if (eRatio > 0) {
        const fillW = (barW - 4) * eRatio;
        renderer.sketchHatch(ctx, eRight - 2 - fillW, topMargin + 2, fillW, barH - 4, -45, 6, enemy.isBoss ? '#8b0000' : '#2b2b2b');
      }

      // Numeric HP
      renderer.sketchText(ctx, `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`, eLeft - 12, topMargin + barH / 2 + 1, {
        font: "14px 'Architects Daughter', cursive",
        color: '#333',
        align: 'right',
        seed: 6,
      });
    }

    // 3. Center Level Badge
    if (levelConfig) {
      const centerBoxW = 140;
      const centerBoxH = 26;
      const cX = width / 2 - centerBoxW / 2;
      const cY = 12;

      renderer.sketchBox(ctx, cX, cY, centerBoxW, centerBoxH, {
        fill: 'rgba(251, 248, 235, 0.85)',
        color: '#222',
        width: 1.6,
        seed: 7,
      });

      renderer.sketchText(ctx, `PAGE ${levelConfig.level} / 10`, width / 2, cY + centerBoxH / 2 + 1, {
        font: "bold 15px 'Permanent Marker', cursive",
        color: '#222',
        align: 'center',
        seed: 8,
      });
    }

    // 4. Center Announcer Banner (e.g. "DUEL START", "LEVEL COMPLETE")
    if (this.bannerTimer > 0) {
      const alpha = Math.min(1.0, this.bannerTimer * 2.0);
      ctx.globalAlpha = alpha;

      const bannerW = Math.min(480, width * 0.8);
      const bannerH = 80;
      const bx = width / 2 - bannerW / 2;
      const by = height * 0.28;

      // Sketched Banner Paper Container
      renderer.sketchBox(ctx, bx, by, bannerW, bannerH, {
        fill: '#fbf8eb',
        color: this.bannerColor,
        width: 2.8,
        seed: 15,
      });

      renderer.sketchText(ctx, this.bannerText, width / 2, by + 28, {
        font: "bold 32px 'Permanent Marker', cursive",
        color: this.bannerColor,
        align: 'center',
        seed: 16,
      });

      if (this.bannerSubtext) {
        renderer.sketchText(ctx, this.bannerSubtext, width / 2, by + 58, {
          font: "18px 'Architects Daughter', cursive",
          color: '#333',
          align: 'center',
          seed: 17,
        });
      }

      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }
}
