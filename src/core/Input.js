// Unified Input Controller for Touch and Keyboard

export class InputController {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      attack: false,
      block: false,
      heavy: false,
      jump: false,
    };

    this.prevKeys = { ...this.keys };
    this.touchState = {
      left: false,
      right: false,
      attack: false,
      block: false,
      jump: false,
    };

    this.touchPointers = new Map(); // pointerId -> action

    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  initMouse() {
    // Prevent right-click context menu during the game
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        // Right Mouse Button -> Attack
        this.keys.attack = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.keys.attack = false;
      }
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
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
        case 'KeyW':
        case 'ArrowUp':
          this.keys.jump = true;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.keys.attack = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
        case 'KeyC':
          this.keys.block = true;
          break;
        case 'KeyX':
        case 'KeyL':
          this.keys.heavy = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
        case 'KeyW':
        case 'ArrowUp':
          this.keys.jump = false;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.keys.attack = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
        case 'KeyC':
          this.keys.block = false;
          break;
        case 'KeyX':
        case 'KeyL':
          this.keys.heavy = false;
          break;
      }
    });
  }

  initTouch() {
    const bindBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const setAction = (active) => {
        this.touchState[action] = active;
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
    bindBtn('btn-attack', 'attack');
    bindBtn('btn-block', 'block');
  }

  update() {
    this.prevKeys = { ...this.keys };
    // Combine keyboard + mouse + touch
    this.keys.left = this.keys.left || this.touchState.left;
    this.keys.right = this.keys.right || this.touchState.right;
    this.keys.attack = this.keys.attack || this.touchState.attack;
    this.keys.block = this.keys.block || this.touchState.block;
    this.keys.jump = this.keys.jump || this.touchState.jump;
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
