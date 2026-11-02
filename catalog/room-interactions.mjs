/** Keep the gaze inside each painted eye, including with a distant pointer. */
export function boundedGaze(dx, dy, radius = 1.8) {
  const length = Math.hypot(dx, dy);
  const reach = Math.min(radius, length / 160);
  return length ? { x: dx / length * reach, y: dy / length * reach } : { x: 0, y: 0 };
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
  document.addEventListener('pointermove', event => {
    if (!running() || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!gazeFrame) gazeFrame = requestAnimationFrame(look);
  }, { passive: true });
  document.addEventListener('pointerleave', restGaze);
  document.addEventListener('roommotionchange', () => { if (!running()) restGaze(); });
  window.addEventListener('blur', restGaze);
}
