// Unified Input Controller for Keyboard, Mouse, and Touch

const ACTIONS = ['left', 'right', 'jump', 'attack', 'heavy', 'block'];

export class InputController {
  constructor(canvas = null, game = null) {
    this.canvas = canvas || document.getElementById('game-canvas');
    this.game = game;

    this.keyboard = {};
    this.mouse = {};
    this.touch = {};
    this.keys = {};
    this.prevKeys = {};

    for (const a of ACTIONS) {
      this.keyboard[a] = false;
      this.mouse[a] = false;
      this.touch[a] = false;
      this.keys[a] = false;
      this.prevKeys[a] = false;
    }

    this.touchPointers = new Map(); // pointerId -> action

    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  reset() {
    for (const a of ACTIONS) {
      this.keyboard[a] = false;
      this.mouse[a] = false;
      this.touch[a] = false;
      this.keys[a] = false;
      this.prevKeys[a] = false;
    }
    this.touchPointers.clear();
    const btnIds = ['btn-left', 'btn-right', 'btn-jump', 'btn-attack', 'btn-heavy', 'btn-block'];
    for (const id of btnIds) {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    }
  }

  initMouse() {
    // Prevent right-click context menu during the game
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const canvas = this.canvas || document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', (e) => {
        if (this.game && this.game.state !== 'playing') return;
        if (e.button === 0) {
          this.mouse.attack = true;
        } else if (e.button === 2) {
          this.mouse.heavy = true;
        }
      });

      canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.mouse.attack = false;
        } else if (e.button === 2) {
          this.mouse.heavy = false;
        }
      });
    }

    // Clear all mouse flags if button is released outside canvas
    window.addEventListener('mouseup', () => {
      for (const a of ACTIONS) {
        this.mouse[a] = false;
      }
    });

    // Window blur safety
    window.addEventListener('blur', () => {
      this.reset();
    });
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keyboard.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keyboard.right = true;
          break;
        case 'Space':
        case 'KeyW':
        case 'ArrowUp':
          this.keyboard.jump = true;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.keyboard.attack = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
        case 'KeyC':
          this.keyboard.block = true;
          break;
        case 'KeyX':
        case 'KeyL':
          this.keyboard.heavy = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keyboard.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keyboard.right = false;
          break;
        case 'Space':
        case 'KeyW':
        case 'ArrowUp':
          this.keyboard.jump = false;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.keyboard.attack = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
        case 'KeyC':
          this.keyboard.block = false;
          break;
        case 'KeyX':
        case 'KeyL':
          this.keyboard.heavy = false;
          break;
      }
    });
  }

  initTouch() {
    const bindBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const setAction = (active) => {
        this.touch[action] = active;
        if (active) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      };

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        this.touchPointers.set(e.pointerId, action);
        setAction(true);
      });

      btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.touchPointers.delete(e.pointerId);
        setAction(false);
      });

      btn.addEventListener('pointercancel', (e) => {
        this.touchPointers.delete(e.pointerId);
        setAction(false);
      });

      btn.addEventListener('pointerleave', (e) => {
        if (!btn.hasPointerCapture || !btn.hasPointerCapture(e.pointerId)) {
          this.touchPointers.delete(e.pointerId);
          setAction(false);
        }
      });
    };

    bindBtn('btn-left', 'left');
    bindBtn('btn-right', 'right');
    bindBtn('btn-jump', 'jump');
    bindBtn('btn-attack', 'attack');
    bindBtn('btn-heavy', 'heavy');
    bindBtn('btn-block', 'block');
  }

  update() {
    this.prevKeys = { ...this.keys };
    for (const a of ACTIONS) {
      this.keys[a] = this.keyboard[a] || this.mouse[a] || this.touch[a];
    }
  }

  isDown(action) {
    return !!this.keys[action];
  }

  isJustPressed(action) {
    return !!this.keys[action] && !this.prevKeys[action];
  }

  isJustReleased(action) {
    return !this.keys[action] && !!this.prevKeys[action];
  }
}
