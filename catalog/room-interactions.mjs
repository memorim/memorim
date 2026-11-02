/** Keep the gaze inside each painted eye, including with a distant pointer. */
export function boundedGaze(dx, dy, radius = 1.8) {
  const length = Math.hypot(dx, dy);
  const reach = Math.min(radius, length / 160);
  return length ? { x: dx / length * reach, y: dy / length * reach } : { x: 0, y: 0 };
}

/** A short scene never loops or extends itself while the pointer stays over it. */
export function createOneShot({ show, hide, duration, cooldown, now = Date.now, schedule = setTimeout, cancel = clearTimeout }) {
  let timer, active = false, next = 0;
  return {
    trigger() {
      if (active || now() < next) return false;
      active = true; next = now() + cooldown; show();
      timer = schedule(() => { timer = undefined; active = false; hide(); }, duration);
      return true;
    },
    stop() { cancel(timer); timer = undefined; active = false; hide(); },
  };
}

/** Count deliberate strokes, not the hundreds of pointer events in one stroke. */
export function createPettingTracker({ purr, now = Date.now }) {
  let point, travel = 0, strokes = 0, last = -Infinity, next = 0;
  function stroke() {
    const time = now();
    if (time < next || time - last < 240) return;
    if (time - last > 4500) strokes = 0;
    last = time;
    if (++strokes === 3) { strokes = 0; next = time + 6500; purr(); }
  }
  return {
    move(x, y) {
      if (point) travel += Math.hypot(x - point.x, y - point.y);
      point = { x, y };
      if (travel >= 36) { travel = 0; stroke(); }
    },
    tap: stroke,
    leave() { point = undefined; travel = 0; },
    reset() { point = undefined; travel = 0; strokes = 0; last = -Infinity; },
  };
}

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const scene = document.querySelector('.room-motion');
  const faces = [...document.querySelectorAll('.soot-face')];
  const running = () => !root.classList.contains('room-paused') && !document.hidden;
  let gazeFrame = 0;
  let pointer;
  function look() {
    gazeFrame = 0;
    if (!running() || !pointer) return;
    const bounds = scene.getBoundingClientRect();
    const x = (pointer.x - bounds.left) * 1792 / bounds.width;
    const y = (pointer.y - bounds.top) * 878 / bounds.height;
    faces.forEach(face => {
      const gaze = boundedGaze(x - Number(face.dataset.x), y - Number(face.dataset.y));
      face.querySelector('.soot-look').style.transform = `translate(${gaze.x}px, ${gaze.y}px)`;
    });
  }
  function restGaze() {
    cancelAnimationFrame(gazeFrame); gazeFrame = 0; pointer = undefined;
    faces.forEach(face => { face.querySelector('.soot-look').style.transform = ''; });
  }
  const cat = document.querySelector('.cat-hit');
  const contentment = createOneShot({
    show: () => root.classList.add('cat-content'), hide: () => root.classList.remove('cat-content'),
    duration: 1900, cooldown: 6500,
  });
  const petting = createPettingTracker({ purr: () => { if (running()) contentment.trigger(); } });
  cat.addEventListener('pointermove', event => {
    if (!running() || event.pointerType === 'touch') return;
    const scale = 1792 / scene.getBoundingClientRect().width;
    petting.move(event.clientX * scale, event.clientY * scale);
  }, { passive: true });
  cat.addEventListener('pointerleave', () => petting.leave());
  cat.addEventListener('click', () => { if (running()) petting.tap(); });
  document.addEventListener('roommotionchange', () => {
    if (!running()) { contentment.stop(); petting.reset(); }
  });
  window.addEventListener('pagehide', () => { contentment.stop(); petting.reset(); });
  let reveals = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function finishReveals() { reveals.forEach(animation => animation.cancel()); reveals = []; }
  document.addEventListener('projectsfiltered', () => {
    finishReveals();
    if (!running() || reduced.matches) return;
    const visible = [...document.querySelectorAll('.project')].filter(card => !card.hidden);
    visible.forEach((card, index) => {
      if (typeof card.animate !== 'function') return;
      reveals.push(card.animate([{ opacity: .22 }, { opacity: 1 }], {
        duration: 260, delay: Math.min(index, 7) * 24,
        easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards',
      }));
    });
  });
  document.addEventListener('roommotionchange', () => { if (!running() || reduced.matches) finishReveals(); });
  window.addEventListener('pagehide', finishReveals);
  document.addEventListener('pointermove', event => {
    if (!running() || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!gazeFrame) gazeFrame = requestAnimationFrame(look);
  }, { passive: true });
  document.addEventListener('pointerleave', restGaze);
  document.addEventListener('roommotionchange', () => { if (!running()) restGaze(); });
  window.addEventListener('blur', restGaze);
}
