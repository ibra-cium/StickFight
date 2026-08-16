// Main Game Loop and State Coordinator for Notebook Duel

import { InputController } from './src/core/Input.js';
import { TouchGestures } from './src/core/TouchGestures.js';
import { Camera } from './src/core/Camera.js';
import { sound } from './src/core/Audio.js';
import { renderer } from './src/graphics/NotebookRenderer.js';
import { particles } from './src/graphics/Particles.js';
import { weather } from './src/graphics/Weather.js';
import { scenery } from './src/systems/Scenery.js';
import { Player } from './src/entities/Player.js';
import { CombatSystem } from './src/systems/CombatSystem.js';
import { LevelSystem } from './src/systems/LevelSystem.js';
import { HUD } from './src/ui/HUD.js';
import { MenuUI } from './src/ui/MenuUI.js';

export const DESIGN_W = 960;
export const DESIGN_H = 540;

class NotebookDuelGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.touchOverlay = document.getElementById('touch-controls');

    this.width = DESIGN_W;
    this.height = DESIGN_H;
    this.viewScale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;

    // Subsystems
    this.input = new InputController(this.canvas, this);
    this.touchGestures = new TouchGestures(this.canvas, this.input, this);
    this.camera = new Camera(this.width, this.height);
    this.combat = new CombatSystem(this.camera);
    this.levelSystem = new LevelSystem();
    this.hud = new HUD();
    this.menuUI = new MenuUI(this);

    // Entities
    this.player = new Player({ x: -160, facing: 1 });
    this.enemy = null;

    // Game state: 'title', 'controls', 'level_select', 'playing', 'victory_screen', 'gameover_screen', 'game_complete'
    this.state = 'title';
    this.matchEndTimer = 0;
    this.lastTime = performance.now();

    this.initFullscreenHandler();
    this.initResize();
    this.setState('title');
    this.syncControlsUI();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initFullscreenHandler() {
    const handleFirstInteraction = () => {
      if (this.state === 'title' || this.state === 'controls') {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch (e) {}
        try {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {}
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
  }

  toGameCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX) / this.viewScale,
      y: (clientY - rect.top - this.offsetY) / this.viewScale,
    };
  }

  initResize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;

      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;

      const screenAspect = rect.width / rect.height;
      if (screenAspect >= 1.5) {
        const maxW = DESIGN_H * 3.6;
        this.viewScale = rect.height / DESIGN_H;
        this.width = Math.min(rect.width / this.viewScale, maxW);
        this.height = DESIGN_H;
        this.offsetX = (rect.width - this.width * this.viewScale) / 2;
        this.offsetY = 0;
      } else {
        this.viewScale = Math.min(rect.width / DESIGN_W, rect.height / DESIGN_H);
        this.width = DESIGN_W;
        this.height = DESIGN_H;
        this.offsetX = (rect.width - DESIGN_W * this.viewScale) / 2;
        this.offsetY = (rect.height - DESIGN_H * this.viewScale) / 2;
      }

      this.camera.resize(this.width, this.height);
      renderer.onResize(this.width, this.height);
      scenery.onResize(this.width, this.height);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));
    resize();
  }

  syncControlsUI() {
    const mode = localStorage.getItem('notebook_duel_control_mode') || 'gesture';
    const isGesture = (mode === 'gesture');

    this.touchGestures.setEnabled(isGesture);

    if (this.touchOverlay) {
      if (this.state === 'playing' && !isGesture) {
        this.touchOverlay.classList.remove('hidden');
      } else {
        this.touchOverlay.classList.add('hidden');
      }
    }
  }

  setState(newState) {
    this.state = newState;
    this.input.reset();
    this.touchGestures.reset();
    this.syncControlsUI();
  }

  startLevel(levelNum) {
    this.input.reset();
    this.touchGestures.reset();
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
    this.input.update(dt);
    this.touchGestures.update(dt);
    renderer.update(dt);

    if (this.state === 'playing') {
      if (this.camera.hitstopTimer <= 0) {
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
    const dpr = this.dpr || 1;
    const ctx = this.ctx;

    // Fill letterbox bars in physical device coordinates
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#242426';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.viewScale, this.viewScale);

    // Clip to design area to keep letterbox clean
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

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

      // 3. Screen Space HUD & Touch Gestures
      this.hud.draw(ctx, this.width, this.height, this.player, this.enemy, this.levelSystem.getCurrentConfig());
      this.touchGestures.draw(ctx, this.width, this.height);
    } else {
      // Draw background scenery behind menus for atmosphere
      this.camera.begin(ctx);
      scenery.draw(ctx);
      this.camera.end(ctx);

      // Draw Menus (Title, Controls, Level Select, Victory, Game Over, Game Complete)
      this.menuUI.draw(ctx, this.width, this.height);
    }

    ctx.restore();
  }

  loop(timestamp) {
    const rawDt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    let dt = rawDt;
    if (this.camera.slowMoTimer > 0) {
      this.camera.slowMoTimer -= rawDt;
      dt *= 0.25;
    }

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new NotebookDuelGame();
});
