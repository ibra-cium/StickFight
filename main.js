// Main Game Loop and State Coordinator for Notebook Duel

import { InputController } from './src/core/Input.js?v=5';
import { Camera } from './src/core/Camera.js?v=5';
import { sound } from './src/core/Audio.js?v=5';
import { renderer } from './src/graphics/NotebookRenderer.js?v=5';
import { particles } from './src/graphics/Particles.js?v=5';
import { weather } from './src/graphics/Weather.js?v=5';
import { scenery } from './src/systems/Scenery.js?v=5';
import { Player } from './src/entities/Player.js?v=5';
import { CombatSystem } from './src/systems/CombatSystem.js?v=5';
import { LevelSystem } from './src/systems/LevelSystem.js?v=5';
import { HUD } from './src/ui/HUD.js?v=5';
import { MenuUI } from './src/ui/MenuUI.js?v=5';

class NotebookDuelGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.touchOverlay = document.getElementById('touch-controls');

    this.width = 960;
    this.height = 540;

    // Subsystems
    this.input = new InputController();
    this.camera = new Camera(this.width, this.height);
    this.combat = new CombatSystem(this.camera);
    this.levelSystem = new LevelSystem();
    this.hud = new HUD();
    this.menuUI = new MenuUI(this);

    // Entities
    this.player = new Player({ x: -160, facing: 1 });
    this.enemy = null;

    // Game state: 'title', 'level_select', 'playing', 'victory_screen', 'gameover_screen', 'game_complete'
    this.state = 'title';
    this.matchEndTimer = 0;
    this.lastTime = performance.now();

    this.initResize();
    this.setState('title');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initResize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;

      this.width = rect.width;
      this.height = rect.height;

      this.camera.resize(this.width, this.height);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));
    resize();
  }

  setState(newState) {
    this.state = newState;
    if (this.touchOverlay) {
      if (this.state === 'playing') {
        this.touchOverlay.classList.remove('hidden');
      } else {
        this.touchOverlay.classList.add('hidden');
      }
    }
  }

  startLevel(levelNum) {
    this.levelSystem.currentLevel = levelNum;
    const cfg = this.levelSystem.getCurrentConfig();

    this.player.reset(-160, 1);
    this.enemy = this.levelSystem.createEnemyForCurrentLevel();
    particles.reset();
    weather.setLevelWeather(levelNum);

    this.hud.showBanner(cfg.enemyName.toUpperCase(), cfg.title, 2.2, cfg.isBoss ? '#8b0000' : '#111');
    this.matchEndTimer = 0;
    this.setState('playing');
  }

  update(dt) {
    renderer.update();

    if (this.state === 'playing') {
      this.input.update();

      if (this.camera.hitstopFrames <= 0) {
        // Player & Enemy updates
        this.player.handleInput(this.input, this.enemy);
        this.player.update(dt);

        if (this.enemy) {
          this.enemy.updateAI(dt, this.player);
          this.enemy.update(dt);
        }

        // Combat Collision
        this.combat.update(this.player, this.enemy);
      }

      // Camera, Particles, Scenery, Weather
      this.camera.update(this.player, this.enemy, dt);
      particles.update(dt);
      scenery.update(dt);
      weather.update(dt, this.camera);
      this.hud.update(dt);

      // Check Match End Conditions
      if (this.enemy && this.enemy.state === 'dead' && this.player.state !== 'dead') {
        this.matchEndTimer += dt;
        if (this.matchEndTimer >= 0.8 && this.player.state !== 'victory') {
          this.player.triggerVictory();
        }
        if (this.matchEndTimer >= 2.2) {
          this.levelSystem.unlockNextLevel();
          if (this.levelSystem.currentLevel === 10) {
            this.setState('game_complete');
          } else {
            this.setState('victory_screen');
          }
        }
      } else if (this.player.state === 'dead') {
        this.matchEndTimer += dt;
        if (this.matchEndTimer >= 0.8 && this.enemy && this.enemy.state !== 'victory') {
          this.enemy.triggerVictory();
        }
        if (this.matchEndTimer >= 2.0) {
          this.setState('gameover_screen');
        }
      }
    } else {
      // Menu / Title / Victory Screens
      this.menuUI.update(dt);
      scenery.update(dt);
      weather.update(dt, null);
    }
  }

  draw() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw Notebook Paper Background (with Blue Ruled Lines & Red Margin)
    renderer.drawPaperBackground(ctx, this.width, this.height, this.camera, weather.lightningFlash);

    if (this.state === 'playing') {
      // 2. World Space Layer with Camera
      this.camera.begin(ctx);

      // Draw Scenery (Clouds, Mountains, Fences, Trees, Ground Line, Grass)
      scenery.draw(ctx);

      // Draw Weather Backdrops (Puddles & Lightning)
      weather.draw(ctx);

      // Draw Entities
      if (this.player) this.player.draw(ctx);
      if (this.enemy) this.enemy.draw(ctx);

      // Draw Particles (Sparks, Slash Trails, Dust, Popups)
      particles.draw(ctx);

      this.camera.end(ctx);

      // 3. Screen Space HUD
      this.hud.draw(ctx, this.width, this.height, this.player, this.enemy, this.levelSystem.getCurrentConfig());
    } else {
      // Draw background scenery behind menus for atmosphere
      this.camera.begin(ctx);
      scenery.draw(ctx);
      this.camera.end(ctx);

      // Draw Menus (Title, Level Select, Victory, Game Over)
      this.menuUI.draw(ctx, this.width, this.height);
    }

    ctx.restore();
  }

  loop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new NotebookDuelGame();
});
