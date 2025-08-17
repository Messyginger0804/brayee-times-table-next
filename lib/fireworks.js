// Simple canvas-based fireworks burst animation
// Usage: triggerFireworks({ duration: 1200, particles: 120 })

export function triggerFireworks(opts = {}) {
  const duration = opts.duration ?? 1200;
  const particleCount = opts.particles ?? 120;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = 9998; // behind SweetAlert2 modal
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  resize();

  const colors = ['#ff5ea8', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7c3aed'];

  const bursts = 3; // number of bursts across the screen
  const particles = [];

  for (let b = 0; b < bursts; b++) {
    const cx = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
    const cy = Math.random() * canvas.height * 0.5 + canvas.height * 0.15;
    const count = Math.floor(particleCount / bursts);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr,
        radius: (1 + Math.random() * 2) * dpr,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
      });
    }
  }

  const start = performance.now();
  function frame(now) {
    const t = now - start;
    const progress = Math.min(1, t / duration);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.vy += 0.04 * dpr; // gravity
      p.vx *= 0.99; p.vy *= 0.99; // drag
      p.x += p.vx; p.y += p.vy;
      p.life = 1 - progress;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(frame);
  const onResize = () => resize();
  window.addEventListener('resize', onResize, { once: true });
}

