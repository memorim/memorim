import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createCatNap } from '../catalog/room.mjs';

function clock() {
  let time = 0, id = 0;
  const pending = new Map();
  return {
    now: () => time,
    schedule(fn, delay) { pending.set(++id, { fn, due: time + delay }); return id; },
    cancel(key) { pending.delete(key); },
    advance(delta) {
      time += delta;
      for (const [key, job] of pending) if (job.due <= time) { pending.delete(key); job.fn(); }
    },
    get size() { return pending.size; },
  };
}

test('cat falls asleep while still hovered; repeated input cannot keep it awake', () => {
  const timer = clock();
  let awake = false, greetings = 0;
  const cat = createCatNap({ ...timer, wake() { awake = true; greetings++; }, sleep() { awake = false; } });
  cat.greet();
  assert.equal(awake, true);
  timer.advance(1800); cat.greet();
  timer.advance(600);
  assert.equal(awake, false);
  cat.greet();
  assert.equal(greetings, 1);
  timer.advance(3100); cat.greet();
  assert.equal(greetings, 2);
  assert.equal(awake, true);
  cat.rest();
  assert.equal(awake, false);
  assert.equal(timer.size, 0);
});

function mount({ reduce = false, saved = null, storageBlocked = false } = {}) {
  const classes = new Set(), handlers = {}, catEvents = {}, toggleEvents = {};
  let paused = false, storage = saved;
  const span = {}, toggle = { hidden: true, querySelector: () => span,
    setAttribute(key, value) { this[key] = value; }, addEventListener(name, fn) { toggleEvents[name] = fn; } };
  const media = { matches: reduce, addEventListener(name, fn) { this[name] = fn; } };
  const context = {
    setTimeout, clearTimeout, Date,
    matchMedia: () => media,
    localStorage: {
      getItem() { if (storageBlocked) throw Error('blocked'); return storage; },
      setItem(_key, value) { if (storageBlocked) throw Error('blocked'); storage = value; },
      removeItem() { storage = null; },
    },
    window: { addEventListener(name, fn) { handlers[name] = fn; } },
    document: {
      hidden: false,
      documentElement: { classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
      } },
      querySelector(selector) {
        return selector === '.room-motion' ? { pauseAnimations() { paused = true; }, unpauseAnimations() { paused = false; } }
          : selector === '.cat-hit' ? { addEventListener(name, fn) { catEvents[name] = fn; } } : toggle;
      },
      addEventListener(name, fn) { handlers[name] = fn; },
    },
  };
  const source = readFileSync(new URL('../catalog/room.mjs', import.meta.url), 'utf8');
  vm.runInNewContext(source.replace('export function', 'function'), context);
  return { context, classes, handlers, catEvents, toggleEvents, toggle, media, get paused() { return paused; }, get storage() { return storage; } };
}

test('reduced motion defaults to a still room; explicit control persists and hidden pages pause', () => {
  const app = mount({ reduce: true });
  assert.equal(app.paused, true);
  assert.ok(app.classes.has('room-paused'));
  assert.equal(app.toggle.hidden, false);
  assert.equal(app.toggle['aria-label'], 'Resume room animation');
  app.toggleEvents.click();
  assert.equal(app.paused, false);
  assert.equal(app.storage, 'on');
  app.context.document.hidden = true; app.handlers.visibilitychange();
  assert.equal(app.paused, true);
  assert.ok(app.classes.has('page-hidden'));
  app.context.document.hidden = false; app.handlers.visibilitychange();
  assert.equal(app.paused, false);
  app.media.change();
  assert.equal(app.paused, true);
  assert.equal(app.storage, null);
});

test('saved pause survives reload and denied storage does not break controls or cat input', () => {
  assert.equal(mount({ saved: 'off' }).paused, true);
  const app = mount({ storageBlocked: true });
  assert.equal(app.paused, false);
  app.catEvents.pointerenter({ pointerType: 'mouse' });
  assert.ok(app.classes.has('cat-awake'));
  app.toggleEvents.click();
  assert.equal(app.paused, true);
  assert.equal(app.classes.has('cat-awake'), false);
  app.handlers.pagehide();
});
