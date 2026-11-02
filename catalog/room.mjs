/** One short wake-up per greeting, even if the pointer remains over the cat. */
export function createCatNap({ wake, sleep, schedule = setTimeout, cancel = clearTimeout, now = Date.now }) {
  let timer;
  let nextGreeting = 0;
  return {
    greet() {
      if (now() < nextGreeting) return;
      nextGreeting = now() + 5500;
      cancel(timer);
      wake();
      timer = schedule(() => { timer = undefined; sleep(); }, 2400);
    },
    rest() { cancel(timer); timer = undefined; sleep(); },
  };
}

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const scene = document.querySelector('.room-motion');
  const cat = document.querySelector('.cat-hit');
  const toggle = document.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let preference;
  try {
    const saved = localStorage.getItem('memorim-room-motion');
    if (saved !== null) preference = saved === 'on';
  } catch { /* A private or restricted browser can still use the controls. */ }

  const nap = createCatNap({
    wake: () => root.classList.add('cat-awake'),
    sleep: () => root.classList.remove('cat-awake'),
  });
  const enabled = () => preference ?? !reduced.matches;
  function syncMotion() {
    const running = enabled();
    root.classList.toggle('room-paused', !running);
    root.classList.toggle('page-hidden', document.hidden);
    if (running && !document.hidden) scene.unpauseAnimations();
    else scene.pauseAnimations();
    toggle.setAttribute('aria-label', running ? 'Pause room animation' : 'Resume room animation');
    toggle.querySelector('span').textContent = running ? 'Pause animation' : 'Resume animation';
    if (!running || document.hidden) nap.rest();
  }
  // Hover, keyboard focus and touch all greet the same original painted cat.
  cat.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') nap.greet(); });
  cat.addEventListener('focus', () => nap.greet());
  cat.addEventListener('click', () => nap.greet());
  toggle.addEventListener('click', () => {
    preference = !enabled();
    try { localStorage.setItem('memorim-room-motion', preference ? 'on' : 'off'); } catch { /* Optional persistence. */ }
    syncMotion();
  });
  reduced.addEventListener('change', () => {
    preference = undefined;
    try { localStorage.removeItem('memorim-room-motion'); } catch { /* Optional persistence. */ }
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', () => nap.rest());
  syncMotion();
  toggle.hidden = false;
}
