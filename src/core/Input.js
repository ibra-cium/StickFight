// Unified Input Controller for Keyboard, Mouse, and Touch

// Unified Input Controller for Keyboard, Mouse, and Touch

export const ACTIONS = ['left', 'right', 'jump', 'attack', 'heavy', 'block', 'crouch', 'dash'];

export class InputController {
  constructor(canvas = null, game = null) {
    this.canvas = canvas || document.getElementById('game-canvas');
    this.game = game;

    this.keyboard = {};
    this.mouse = {};
    this.touch = {};
    this.keys = {};
    this.prevKeys = {};

    this.axisX = 0;
    this.touchAxisX = 0;
    this.heavyVariant = 'overhead'; // 'overhead', 'uppercut', 'thrust'

    // Input buffering for attack, heavy, dash (150ms window)
    this.bufferTimers = {};
    this.consumed = {};

    for (const a of ACTIONS) {
      this.keyboard[a] = false;
      this.mouse[a] = false;
      this.touch[a] = false;
      this.keys[a] = false;
      this.prevKeys[a] = false;
      this.bufferTimers[a] = 0;
      this.consumed[a] = false;
    }

    this.touchPointers = new Map(); // pointerId -> action
    this.eventQueue = []; // [{ action, time }]

    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  queueAction(action) {
    this.eventQueue.push({ action, time: performance.now() });
  }

  reset() {
    this.eventQueue = [];
    for (const a of ACTIONS) {
      this.keyboard[a] = false;
      this.mouse[a] = false;
      this.touch[a] = false;
      this.keys[a] = false;
      this.prevKeys[a] = false;
      this.bufferTimers[a] = 0;
      this.consumed[a] = false;
    }
    this.axisX = 0;
    this.touchAxisX = 0;
    this.heavyVariant = 'overhead';
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
        case 'ArrowDown':
        case 'KeyS':
          this.keyboard.crouch = true;
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
        case 'KeyE':
        case 'KeyF':
          this.keyboard.dash = true;
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
        case 'ArrowDown':
        case 'KeyS':
          this.keyboard.crouch = false;
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
        case 'KeyE':
        case 'KeyF':
          this.keyboard.dash = false;
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

  update(dt = 1 / 60) {
    this.prevKeys = { ...this.keys };

    // Drain eventQueue: any action queued since last update becomes a one-frame pulse ORed into keys
    const queuedPulses = {};
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (item && item.action) {
        queuedPulses[item.action] = true;
      }
    }

    for (const a of ACTIONS) {
      const isNowDown = !!(this.keyboard[a] || this.mouse[a] || this.touch[a] || queuedPulses[a]);
      const wasDown = !!this.prevKeys[a];

      this.keys[a] = isNowDown;

      // Update 150ms buffer timer
      if (this.bufferTimers[a] > 0) {
        this.bufferTimers[a] -= dt;
        if (this.bufferTimers[a] <= 0) {
          this.bufferTimers[a] = 0;
          this.consumed[a] = false;
        }
      }

      // If queued in eventQueue or newly pressed -> start/refresh 150ms buffer window
      if (queuedPulses[a] || (isNowDown && !wasDown)) {
        this.bufferTimers[a] = 0.15; // 150ms buffer
        this.consumed[a] = false;
      }
    }

    // Compute axisX (-1..1)
    let kbAxis = 0;
    if (this.keyboard.left && !this.keyboard.right) kbAxis = -1;
    else if (this.keyboard.right && !this.keyboard.left) kbAxis = 1;

    if (kbAxis !== 0) {
      this.axisX = kbAxis;
    } else if (Math.abs(this.touchAxisX) > 0.01) {
      this.axisX = this.touchAxisX;
    } else if (this.touch.left && !this.touch.right) {
      this.axisX = -1;
    } else if (this.touch.right && !this.touch.left) {
      this.axisX = 1;
    } else {
      this.axisX = 0;
    }
  }

  consume(action) {
    this.consumed[action] = true;
    this.bufferTimers[action] = 0;
    if (action === 'heavy') {
      this.heavyVariant = 'overhead';
    }
  }

  isDown(action) {
    return !!this.keys[action];
  }

  isJustPressed(action) {
    // For buffered actions (attack, heavy, dash, jump)
    if (['attack', 'heavy', 'dash', 'jump'].includes(action)) {
      return this.bufferTimers[action] > 0 && !this.consumed[action];
    }
    // Default raw just-pressed check
    return !!this.keys[action] && !this.prevKeys[action];
  }

  isJustReleased(action) {
    return !this.keys[action] && !!this.prevKeys[action];
  }
}
