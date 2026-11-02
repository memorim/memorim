import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { boundedGaze, createOneShot, createPettingTracker } from '../catalog/room-interactions.mjs';

function clock() {
  let time = 0, id = 0;
  const jobs = new Map();
  return {
    now: () => time,
    schedule(fn, delay) { jobs.set(++id, { fn, at: time + delay }); return id; },
    cancel(key) { jobs.delete(key); },
    tick(delta) { time += delta; for (const [key, job] of jobs) if (job.at <= time) { jobs.delete(key); job.fn(); } },
    get pending() { return jobs.size; },
  };
}

test('pupils stay inside the eyes, point toward the cursor and handle their own centre', () => {
  assert.deepEqual(boundedGaze(0, 0), { x: 0, y: 0 });
  for (const [x, y] of [[1, 2], [5000, 1000], [-90, -500], [0, 999]]) {
    const gaze = boundedGaze(x, y);
    assert.ok(Math.hypot(gaze.x, gaze.y) <= 1.800001);
    assert.equal(Math.sign(gaze.x), Math.sign(x));
    assert.equal(Math.sign(gaze.y), Math.sign(y));
  }
});

test('console and squint finish on time despite repeated hover; stopping cancels pending work', () => {
  const time = clock(); let shown = 0, visible = false;
  const scene = createOneShot({ ...time, duration: 3400, cooldown: 6500,
    show() { shown++; visible = true; }, hide() { visible = false; } });
  assert.equal(scene.trigger(), true);
  time.tick(3000); assert.equal(scene.trigger(), false);
  time.tick(400); assert.equal(visible, false);
  assert.equal(scene.trigger(), false);
  time.tick(3100); assert.equal(scene.trigger(), true);
  scene.stop(); assert.equal(visible, false); assert.equal(time.pending, 0);
  time.tick(7000); scene.trigger(); assert.equal(shown, 3);
  scene.stop();
});

test('three deliberate strokes or taps cause one squint; jitter, stale strokes and cooldown do not', () => {
  const time = clock(); let purrs = 0;
  const pet = createPettingTracker({ now: time.now, purr() { purrs++; } });
  pet.move(0, 0);
  for (let x = 1; x < 10; x++) pet.move(x, 0);
  assert.equal(purrs, 0);
  pet.move(45, 0); time.tick(300); pet.move(0, 0); time.tick(300); pet.move(45, 0);
  assert.equal(purrs, 1);
  for (let i = 0; i < 20; i++) { pet.tap(); time.tick(100); }
  assert.equal(purrs, 1);
  time.tick(6500); pet.tap(); time.tick(4600); pet.tap(); time.tick(300); pet.tap();
  assert.equal(purrs, 1);
  time.tick(300); pet.tap(); assert.equal(purrs, 2);
  pet.reset(); time.tick(7000); pet.tap(); time.tick(300); pet.tap(); pet.reset();
  time.tick(300); pet.tap(); assert.equal(purrs, 2);
});

function target(extra = {}) {
  const events = new Map();
  return { ...extra,
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
    fire(name, event = {}) { for (const fn of events.get(name) ?? []) fn(event); },
  };
}
function mount() {
  const time = clock(), classes = new Set(), frames = new Map(); let frameID = 0;
  const pupils = [{ style: {} }, { style: {} }];
  const faces = pupils.map((pupil, i) => ({ dataset: { x: String(i * 100 + 400), y: '300' }, querySelector: () => pupil }));
  const cat = target(), consoleButton = target(), media = { matches: false }, animations = [];
  const cards = [false, true, false].map(hidden => ({ hidden, animate(keyframes, options) {
    const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation); return animation;
  } }));
  const document = target({ hidden: false,
    documentElement: { classList: { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key) } },
    querySelector(selector) { return selector === '.cat-hit' ? cat : selector === '.console-hit' ? consoleButton
      : { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1792, height: 878 }) }; },
    querySelectorAll(selector) { return selector === '.soot-face' ? faces : cards; },
  });
  const window = target();
  const context = { document, window, Date: { now: time.now }, setTimeout: time.schedule, clearTimeout: time.cancel,
    requestAnimationFrame(fn) { frames.set(++frameID, fn); return frameID; }, cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia: () => media,
  };
  const source = readFileSync(new URL('../catalog/room-interactions.mjs', import.meta.url), 'utf8');
  vm.runInNewContext(source.replaceAll('export function', 'function'), context);
  return { time, classes, frames, pupils, cat, consoleButton, document, window, media, animations };
}

test('pointer work is coalesced and pausing cancels gaze, console and card animation together', () => {
  const app = mount();
  for (let x = 0; x < 100; x++) app.document.fire('pointermove', { clientX: x, clientY: 200, pointerType: 'mouse' });
  assert.equal(app.frames.size, 1);
  app.consoleButton.fire('pointerenter', { pointerType: 'mouse' });
  assert.ok(app.classes.has('console-playing'));
  app.document.fire('projectsfiltered'); assert.equal(app.animations.length, 2);
  app.classes.add('room-paused'); app.document.fire('roommotionchange');
  assert.equal(app.frames.size, 0); assert.equal(app.time.pending, 0);
  assert.equal(app.classes.has('console-playing'), false);
  assert.ok(app.animations.every(a => a.cancelled));
  app.consoleButton.fire('click'); app.document.fire('projectsfiltered');
  assert.equal(app.time.pending, 0); assert.equal(app.animations.length, 2);
});

test('quick filter changes cancel earlier fades; pausing skips fades and hidden tabs stop scenes', () => {
  const app = mount();
  app.document.fire('projectsfiltered'); app.document.fire('projectsfiltered');
  assert.equal(app.animations.length, 4);
  assert.ok(app.animations.slice(0, 2).every(a => a.cancelled));
  assert.deepEqual(app.animations.slice(2).map(a => a.options.delay), [0, 24]);
  assert.ok(app.animations.every(a => a.keyframes.every(frame => !('transform' in frame))));
  app.classes.add('room-paused'); app.document.fire('projectsfiltered');
  assert.equal(app.animations.length, 4);
  app.classes.delete('room-paused'); app.consoleButton.fire('click'); app.document.hidden = true; app.document.fire('roommotionchange');
  assert.equal(app.classes.has('console-playing'), false);
  assert.equal(app.time.pending, 0);
});
