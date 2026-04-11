import { useEffect, useRef } from 'react';

/** Kubeez brand accent — matches marketing promo. */
const R = 78;
const G = 80;
const B = 190;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

function createParticles(width: number, height: number, count: number): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return list;
}

function clampParticle(p: Particle, width: number, height: number): void {
  p.x += p.vx;
  p.y += p.vy;
  if (p.x < 0) {
    p.x = 0;
    p.vx *= -1;
  } else if (p.x > width) {
    p.x = width;
    p.vx *= -1;
  }
  if (p.y < 0) {
    p.y = 0;
    p.vy *= -1;
  } else if (p.y > height) {
    p.y = height;
    p.vy *= -1;
  }
}

/**
 * Ambient “constellation” canvas: drifting nodes + distance-based links + soft brand glows.
 * Inspired by common particle-network hero backgrounds; tuned for a narrow gate viewport.
 */
export function MobileGateCanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let linkDistance = 100;
    let timeSec = 0;

    const drawScene = (tMs: number) => {
      timeSec = tMs * 0.001;

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      const orb1 = ctx.createRadialGradient(
        width * 0.15,
        height * 0.1,
        0,
        width * 0.15,
        height * 0.1,
        Math.max(width, height) * 0.5,
      );
      orb1.addColorStop(0, `rgba(${R},${G},${B},0.14)`);
      orb1.addColorStop(1, 'rgba(9,9,11,0)');
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, width, height);

      const orb2 = ctx.createRadialGradient(
        width * 0.88,
        height * 0.82,
        0,
        width * 0.88,
        height * 0.82,
        Math.max(width, height) * 0.42,
      );
      orb2.addColorStop(0, 'rgba(130,110,230,0.07)');
      orb2.addColorStop(1, 'rgba(9,9,11,0)');
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, width, height);

      const n = particles.length;
      for (let i = 0; i < n; i += 1) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < n; j += 1) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDistance && dist > 0) {
            const fade = 1 - dist / linkDistance;
            const alpha = fade * 0.38;
            ctx.strokeStyle = `rgba(${R},${G},${B},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const pulse = 0.72 + Math.sin(timeSec * 1.15 + p.phase) * 0.12;
        const coreR = 2.1 * pulse;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, coreR * 5);
        glow.addColorStop(0, `rgba(${R},${G},${B},${0.5 * pulse})`);
        glow.addColorStop(0.45, `rgba(${R},${G},${B},${0.1 * pulse})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${R},${G},${B},${0.92 * pulse})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (tMs: number) => {
      if (!reducedMotion) {
        for (const p of particles) {
          clampParticle(p, width, height);
        }
      }
      drawScene(tMs);
      if (!reducedMotion) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const applySize = () => {
      const el = canvas.parentElement;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = Math.max(0, Math.floor(rect.width));
      const h = Math.max(0, Math.floor(rect.height));
      if (w < 48 || h < 48) return;

      width = w;
      height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = width * height;
      const count = Math.min(72, Math.max(24, Math.floor(area / 11000)));
      linkDistance = Math.min(130, Math.max(72, Math.min(width, height) * 0.26));
      particles = createParticles(width, height, count);

      if (reducedMotion) {
        drawScene(0);
      }
    };

    applySize();

    const onResize = () => {
      applySize();
    };

    const ro = new ResizeObserver(onResize);
    const parentEl = canvas.parentElement;
    if (parentEl) {
      ro.observe(parentEl);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    if (!reducedMotion) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
