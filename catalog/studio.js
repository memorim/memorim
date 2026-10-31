(() => {
  const root = document.documentElement;
  const studio = document.querySelector('.studio');
  const toggle = document.querySelector('.motion-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let preference = null;
  try { preference = localStorage.getItem('memorim-room-motion'); } catch { /* Storage is optional. */ }
  if (preference !== null) paused = preference === 'paused' || reducedMotion.matches;

  function syncMotion() {
    root.classList.toggle('motion-paused', paused);
    toggle.disabled = reducedMotion.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', reducedMotion.matches ? 'Animations disabled by your system preference' : paused ? 'Resume room animations' : 'Pause room animations');
    toggle.querySelector('[aria-hidden]').textContent = paused ? '▷' : 'Ⅱ';
    toggle.querySelector('.motion-label').textContent = reducedMotion.matches ? 'Reduced motion' : paused ? 'Resume animation' : 'Pause animation';
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    preference = paused ? 'paused' : 'playing';
    try { localStorage.setItem('memorim-room-motion', paused ? 'paused' : 'playing'); } catch { /* No persistence needed. */ }
    syncMotion();
  });
  reducedMotion.addEventListener('change', event => { paused = event.matches || preference === 'paused'; syncMotion(); });
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));
  syncMotion();

  const resetScroll = () => { document.querySelector('main').scrollTop = 0; };
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', resetScroll));
  window.addEventListener('popstate', resetScroll);

  const dust = document.querySelector('.dust');
  for (let index = 0; index < 20; index++) {
    const mote = document.createElement('i');
    mote.style.left = `${7 + ((index * 37) % 85)}%`;
    mote.style.top = `${15 + ((index * 23) % 75)}%`;
    mote.style.setProperty('--duration', `${16 + (index % 7) * 3}s`);
    mote.style.setProperty('--delay', `${-index * 2.7}s`);
    dust.append(mote);
  }

  const timers = new Map();
  function react(className, duration) {
    if (paused || reducedMotion.matches) return;
    clearTimeout(timers.get(className));
    studio.classList.add(className);
    timers.set(className, setTimeout(() => { studio.classList.remove(className); timers.delete(className); }, duration));
  }
  const cat = document.querySelector('.cat-hit');
  cat.addEventListener('pointerenter', () => react('cat-awake', 4500));
  cat.addEventListener('focus', () => react('cat-awake', 4500));
  cat.addEventListener('click', () => react('cat-awake', 4500));
  const soot = document.querySelector('.soot-hit');
  soot.addEventListener('pointerenter', () => react('soot-startled', 1800));
  soot.addEventListener('click', () => react('soot-startled', 1800));
  document.querySelector('.console-hit').addEventListener('click', () => react('game-active', 1400));
})();
