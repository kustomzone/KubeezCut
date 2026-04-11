import { useEffect, useRef } from 'react';

/** Full NLE-style mockup: chrome bar, media / preview / properties, color-coded timeline with ruler + playhead. */
export function KubeezCutHomeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onMq = () => {
      reducedMotionRef.current = mq.matches;
    };
    mq.addEventListener('change', onMq);

    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      return () => mq.removeEventListener('change', onMq);
    }

    const rawCtx = canvasEl.getContext('2d', { alpha: true });
    if (!rawCtx) {
      return () => mq.removeEventListener('change', onMq);
    }
    const ctx: CanvasRenderingContext2D = rawCtx;

    let w = 0;
    let h = 0;
    let dpr = 1;

    /** One looping tape per track: fixed segment order, single scroll offset — clips never overlap. */
    type TapeSeg = { width: number; gap: number; seed: number };
    type TrackTape = { segments: TapeSeg[]; leftEdges: number[]; tapeW: number };
    let trackTapes: TrackTape[] = [];
    /** Horizontal scroll in px (increases = tape moves left). */
    let trackScroll: number[] = [0, 0, 0, 0, 0, 0];
    let scrollGlobal = 0;
    let prevFrameTime = 0;

    const TRACK_LABELS = ['V1', 'V2', 'A1', 'A2', 'MUS', 'FX'] as const;
    /** Pixels per second; uniform motion per track so segment spacing is preserved (no collisions). */
    const TRACK_PX_PER_SEC = [20, 16, 22, 14, 18, 12];

    function buildTrackTape(isFx: boolean): TrackTape {
      const segments: TapeSeg[] = [];
      const targetMin = Math.max(w * 2.4, 800);
      let acc = 0;
      while (acc < targetMin) {
        const cw = isFx ? 40 + Math.random() * 56 : 56 + Math.random() * 92;
        const gap = isFx ? 18 + Math.random() * 26 : 8 + Math.random() * 12;
        segments.push({ width: cw, gap, seed: Math.random() * 10000 });
        acc += cw + gap;
      }
      const leftEdges: number[] = [];
      acc = 0;
      for (const s of segments) {
        leftEdges.push(acc);
        acc += s.width + s.gap;
      }
      return { segments, leftEdges, tapeW: acc };
    }

    function initClips() {
      trackTapes = [];
      trackScroll = [];
      for (let t = 0; t < 6; t++) {
        trackTapes.push(buildTrackTape(t === 5));
        trackScroll.push(Math.random() * 280 + t * 40);
      }
    }

    function resize() {
      const surface = canvasRef.current;
      if (!surface) return;
      dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const rect = surface.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      surface.width = Math.floor(w * dpr);
      surface.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initClips();
      prevFrameTime = 0;
    }

    const t0 = performance.now();

    const COL = {
      bg: '#0a0a0f',
      panelBorder: 'rgba(255,255,255,0.07)',
      chromeBg: '#12121a',
      textMuted: 'rgba(255,255,255,0.4)',
      textDim: 'rgba(255,255,255,0.55)',
      v1Fill: 'rgba(59,130,246,0.88)',
      v1Border: 'rgba(96,165,250,0.75)',
      v2Fill: 'rgba(37,99,235,0.82)',
      v2Border: 'rgba(147,197,253,0.65)',
      aFill: 'rgba(34,197,94,0.78)',
      aBorder: 'rgba(74,222,128,0.65)',
      musFill: 'rgba(245,158,11,0.82)',
      musBorder: 'rgba(251,191,36,0.7)',
      fxFill: 'rgba(168,85,247,0.75)',
      fxBorder: 'rgba(192,132,252,0.65)',
      playhead: 'rgba(239,68,68,0.95)',
      rulerBg: '#14141c',
    };

    function layout() {
      const chromeH = Math.max(32, Math.min(40, h * 0.045));
      const below = h - chromeH;
      const mainH = below * 0.56;
      const timelineH = below * 0.44;
      const timelineTop = chromeH + mainH;
      const labelCol = Math.min(56, Math.max(44, w * 0.065));
      const leftW = w * 0.18;
      const midW = w * 0.5;
      const rightW = w - leftW - midW;
      return { chromeH, mainH, timelineH, timelineTop, labelCol, leftW, midW, rightW, below };
    }

    function roundRectPath(x: number, y: number, rw: number, rh: number, r: number) {
      const rr = Math.min(r, rw / 2, rh / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, rw, rh, rr);
      } else {
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + rw, y, x + rw, y + rh, rr);
        ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
        ctx.arcTo(x, y + rh, x, y, rr);
        ctx.arcTo(x, y, x + rw, y, rr);
        ctx.closePath();
      }
    }

    function drawChrome() {
      const { chromeH } = layout();
      ctx.fillStyle = COL.chromeBg;
      ctx.fillRect(0, 0, w, chromeH);
      ctx.strokeStyle = COL.panelBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, chromeH);
      ctx.lineTo(w, chromeH);
      ctx.stroke();

      const pad = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 4; i++) {
        const bx = pad + i * 22;
        const by = chromeH * 0.5 - 7;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(bx, by, 14, 14);
      }

      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('00:01:24:12', w * 0.5, chromeH * 0.5);

      const exportW = 64;
      ctx.fillStyle = 'rgba(139,92,246,0.35)';
      ctx.strokeStyle = 'rgba(167,139,250,0.45)';
      ctx.lineWidth = 1;
      const ex = w - pad - exportW;
      const ey = chromeH * 0.5 - 11;
      roundRectPath(ex, ey, exportW, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText('Export', ex + exportW * 0.5, chromeH * 0.5);
      ctx.textAlign = 'left';
    }

    function drawMediaLibrary(x0: number, y0: number, pw: number, ph: number) {
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = COL.panelBorder;
      ctx.strokeRect(x0, y0, pw, ph);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x0, y0, pw, 26);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 26);
      ctx.lineTo(x0 + pw, y0 + 26);
      ctx.stroke();
      ctx.font = '600 9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('MEDIA', x0 + 10, y0 + 13);

      const pad = 8;
      const thumbW = (pw - pad * 3) / 2;
      const thumbH = Math.min(44, Math.max(34, (ph - 48) / 3.2));
      const labels = ['hero_wide.mp4', 'interview.wav', 'drone_4k.mov', 'music_stem.mp3', 'graphic.mov', 'sfx_hit.wav'];
      let ty = y0 + 34;
      let idx = 0;
      for (let r = 0; r < 3 && ty + thumbH < y0 + ph - 6; r++) {
        for (let c = 0; c < 2; c++) {
          const tx = x0 + pad + c * (thumbW + pad);
          const isSel = idx === 0;
          const g = ctx.createLinearGradient(tx, ty, tx, ty + thumbH);
          g.addColorStop(0, 'rgba(28,28,34,1)');
          g.addColorStop(0.55, 'rgba(18,18,24,1)');
          g.addColorStop(1, 'rgba(12,12,18,1)');
          ctx.fillStyle = g;
          roundRectPath(tx, ty, thumbW, thumbH, 3);
          ctx.fill();
          if (isSel) {
            ctx.strokeStyle = 'rgba(99,102,241,0.75)';
            ctx.lineWidth = 1.5;
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.09)';
            ctx.lineWidth = 1;
          }
          ctx.stroke();
          if (isSel) {
            ctx.fillStyle = 'rgba(99,102,241,0.25)';
            ctx.fillRect(tx, ty, 3, thumbH);
          }
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(tx + 5, ty + 6, thumbW - 10, thumbH - 22);
          const filmG = ctx.createLinearGradient(tx + 5, ty + 6, tx + thumbW - 5, ty + thumbH - 16);
          filmG.addColorStop(0, 'rgba(55,65,85,0.35)');
          filmG.addColorStop(1, 'rgba(25,30,40,0.5)');
          ctx.fillStyle = filmG;
          ctx.fillRect(tx + 5, ty + 6, thumbW - 10, thumbH - 22);

          ctx.font = '600 8px ui-monospace, monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.textBaseline = 'bottom';
          const name = labels[idx] ?? 'clip';
          const show = name.length > 14 ? `${name.slice(0, 12)}…` : name;
          ctx.fillText(show, tx + 4, ty + thumbH - 3);
          idx += 1;
        }
        ty += thumbH + 6;
      }
      ctx.textBaseline = 'alphabetic';
    }

    function drawPreview(x0: number, y0: number, pw: number, ph: number) {
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = COL.panelBorder;
      ctx.strokeRect(x0, y0, pw, ph);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x0, y0, pw, 26);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 26);
      ctx.lineTo(x0 + pw, y0 + 26);
      ctx.stroke();
      ctx.font = '600 9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('PROGRAM', x0 + 10, y0 + 13);

      const chromeBottom = 44;
      const inset = 10;
      const topPad = 26 + inset;
      const vw = pw - inset * 2;
      const vh = ph - topPad - chromeBottom;
      const vx = x0 + inset;
      const vy = y0 + topPad;

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      roundRectPath(vx - 1, vy - 1, vw + 2, vh + 2, 4);
      ctx.stroke();

      const vg = ctx.createLinearGradient(vx, vy, vx + vw, vy + vh);
      vg.addColorStop(0, '#1e293b');
      vg.addColorStop(0.4, '#0f172a');
      vg.addColorStop(1, '#020617');
      ctx.fillStyle = vg;
      roundRectPath(vx, vy, vw, vh, 3);
      ctx.fill();

      const corner = 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vx + 8, vy + 8 + corner);
      ctx.lineTo(vx + 8, vy + 8);
      ctx.lineTo(vx + 8 + corner, vy + 8);
      ctx.moveTo(vx + vw - 8 - corner, vy + 8);
      ctx.lineTo(vx + vw - 8, vy + 8);
      ctx.lineTo(vx + vw - 8, vy + 8 + corner);
      ctx.moveTo(vx + vw - 8, vy + vh - 8 - corner);
      ctx.lineTo(vx + vw - 8, vy + vh - 8);
      ctx.lineTo(vx + vw - 8 - corner, vy + vh - 8);
      ctx.moveTo(vx + 8 + corner, vy + vh - 8);
      ctx.lineTo(vx + 8, vy + vh - 8);
      ctx.lineTo(vx + 8, vy + vh - 8 - corner);
      ctx.stroke();

      const ctlY = y0 + ph - chromeBottom + 8;
      const barY = y0 + ph - 14;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRectPath(x0 + inset, barY - 3, pw - inset * 2, 5, 2);
      ctx.fill();
      const prog = 0.38;
      ctx.fillStyle = 'rgba(99,102,241,0.65)';
      roundRectPath(x0 + inset, barY - 3, (pw - inset * 2) * prog, 5, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x0 + inset + (pw - inset * 2) * prog, barY - 0.5, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(x0 + inset + 6, ctlY - 5);
      ctx.lineTo(x0 + inset + 6, ctlY + 5);
      ctx.lineTo(x0 + inset + 14, ctlY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x0 + inset + 10, ctlY, 11, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '600 10px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('00:01:24:12  /  00:15:00:00', x0 + pw * 0.5, ctlY);

      ctx.font = '600 9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'right';
      ctx.fillText('1920 × 1080', x0 + pw - inset - 4, y0 + 13);
      ctx.textAlign = 'left';
    }

    function drawProperties(x0: number, y0: number, pw: number, ph: number) {
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = COL.panelBorder;
      ctx.strokeRect(x0, y0, pw, ph);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x0, y0, pw, 26);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 26);
      ctx.lineTo(x0 + pw, y0 + 26);
      ctx.stroke();
      ctx.font = '600 9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('INSPECTOR', x0 + 10, y0 + 13);

      ctx.font = '600 8px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('TRANSFORM', x0 + 10, y0 + 44);

      const rows: [string, string, number][] = [
        ['Scale', '100', 0.72],
        ['Position X', '960', 0.55],
        ['Position Y', '540', 0.48],
        ['Opacity', '100', 0.88],
      ];
      const valW = 44;
      const trackLeft = x0 + 10;
      const trackW = Math.max(40, x0 + pw - valW - 12 - trackLeft);

      let ry = y0 + 54;
      for (const [label, val, fillT] of rows) {
        ctx.fillStyle = 'rgba(235,235,245,0.88)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x0 + 10, ry);

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRectPath(x0 + pw - valW - 10, ry - 11, valW, 18, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.textAlign = 'right';
        ctx.fillText(val, x0 + pw - 14, ry);

        const slY = ry + 10;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        roundRectPath(trackLeft, slY, trackW, 5, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(99,102,241,0.55)';
        roundRectPath(trackLeft, slY, trackW * fillT, 5, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.arc(trackLeft + trackW * fillT, slY + 2.5, 4, 0, Math.PI * 2);
        ctx.fill();

        ry += 36;
        if (ry > y0 + ph - 16) break;
      }
      ctx.textAlign = 'left';
    }

    function drawBarWaveform(
      clipX: number,
      clipY: number,
      clipW: number,
      clipH: number,
      seed: number,
      time: number,
    ) {
      const pad = 3;
      const innerW = clipW - pad * 2;
      const innerH = clipH - pad * 2;
      const mid = clipY + clipH * 0.5;
      const barW = 2;
      const step = 3;
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX + pad, clipY + pad, innerW, innerH);
      ctx.clip();
      for (let x = clipX + pad; x < clipX + pad + innerW; x += step) {
        const u = (x + seed * 0.01 + time * 18) * 0.15;
        const hBar = (0.35 + ((Math.sin(u * 3.1) * 0.5 + 0.5) * 0.45 + (Math.sin(u * 7.2 + seed) * 0.5 + 0.5) * 0.2)) * innerH * 0.45;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, mid - hBar, barW, hBar * 2);
      }
      ctx.restore();
    }

    function drawSineWaveform(
      clipX: number,
      clipY: number,
      clipW: number,
      clipH: number,
      seed: number,
      time: number,
    ) {
      const pad = 3;
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX + pad, clipY + pad, clipW - pad * 2, clipH - pad * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.25;
      const yMid = clipY + clipH * 0.5;
      const amp = clipH * 0.28;
      for (let x = clipX + pad; x < clipX + clipW - pad; x += 2) {
        const u = (x + seed + time * 35) * 0.06;
        const yy = yMid + Math.sin(u) * amp * 0.85 + Math.sin(u * 2.4 + seed * 0.001) * amp * 0.2;
        if (x === clipX + pad) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    function paintSegmentClip(
      i: number,
      cx: number,
      cy: number,
      cw: number,
      ch: number,
      seed: number,
      time: number,
    ) {
      let fill = COL.v1Fill;
      let border = COL.v1Border;
      if (i === 1) {
        fill = COL.v2Fill;
        border = COL.v2Border;
      } else if (i === 2 || i === 3) {
        fill = COL.aFill;
        border = COL.aBorder;
      } else if (i === 4) {
        fill = COL.musFill;
        border = COL.musBorder;
      } else if (i === 5) {
        fill = COL.fxFill;
        border = COL.fxBorder;
      }

      const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
      grad.addColorStop(0, fill);
      grad.addColorStop(1, border);
      ctx.fillStyle = grad;
      roundRectPath(cx, cy, cw, ch, 3);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (i === 2 || i === 3) {
        drawBarWaveform(cx, cy, cw, ch, seed, time);
      } else if (i === 4) {
        drawSineWaveform(cx, cy, cw, ch, seed, time);
      }
    }

    function drawTimeline(now: number) {
      const { timelineTop, timelineH, labelCol } = layout();
      const t = (now - t0) * 0.001;

      if (prevFrameTime === 0) prevFrameTime = now;
      const dt = reducedMotionRef.current ? 0 : Math.min(0.05, Math.max(0, (now - prevFrameTime) / 1000));
      prevFrameTime = now;
      if (!reducedMotionRef.current) {
        scrollGlobal += dt * 28;
        for (let i = 0; i < 6; i++) {
          trackScroll[i] = (trackScroll[i] ?? 0) + (TRACK_PX_PER_SEC[i] ?? 18) * dt;
        }
      }

      const rulerH = Math.max(22, timelineH * 0.12);
      const tracksAreaH = timelineH - rulerH;
      const trackCount = 6;
      const trackGap = 3;
      const trackH = Math.max(14, (tracksAreaH - trackGap * (trackCount - 1)) / trackCount);

      ctx.fillStyle = COL.rulerBg;
      ctx.fillRect(0, timelineTop, w, rulerH);
      ctx.strokeStyle = COL.panelBorder;
      ctx.beginPath();
      ctx.moveTo(0, timelineTop + rulerH);
      ctx.lineTo(w, timelineTop + rulerH);
      ctx.stroke();

      const contentLeft = labelCol;
      const contentW = w - contentLeft - 8;
      const secPx = 42;
      const scrollPx = scrollGlobal * 0.6;

      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = COL.textMuted;
      ctx.textBaseline = 'middle';
      for (let s = -2; s * secPx < w + secPx * 2; s++) {
        const x = contentLeft + s * secPx - (scrollPx % secPx);
        if (x < contentLeft || x > w - 4) continue;
        const sec = Math.floor((s * secPx + scrollPx) / secPx) % 60;
        const m = Math.floor(((s * secPx + scrollPx) / secPx / 60) % 10);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, timelineTop + 4, 1, rulerH - 8);
        ctx.fillStyle = COL.textMuted;
        ctx.fillText(`${m}:${sec.toString().padStart(2, '0')}`, x + 3, timelineTop + rulerH * 0.5);
      }

      const tracksTop = timelineTop + rulerH + 4;

      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, tracksTop - 2, w, tracksAreaH + 4);

      for (let i = 0; i < trackCount; i++) {
        const ty = tracksTop + i * (trackH + trackGap);
        const label = TRACK_LABELS[i] ?? '';

        ctx.fillStyle = 'rgba(10,10,15,0.95)';
        ctx.fillRect(4, ty, labelCol - 8, trackH);
        ctx.strokeStyle = COL.panelBorder;
        ctx.strokeRect(4, ty, labelCol - 8, trackH);
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 4 + (labelCol - 8) * 0.5, ty + trackH * 0.5);
        ctx.textAlign = 'left';

        const tape = trackTapes[i];
        const scroll = trackScroll[i] ?? 0;
        if (!tape || tape.tapeW <= 0) continue;

        ctx.strokeStyle = COL.panelBorder;
        ctx.strokeRect(contentLeft, ty, contentW, trackH);

        ctx.save();
        ctx.beginPath();
        ctx.rect(contentLeft + 0.5, ty + 0.5, contentW - 1, trackH - 1);
        ctx.clip();

        const ch = trackH - 4;
        const cy = ty + 2;
        const padX = 2;
        const minX = contentLeft - 2;
        const maxX = contentLeft + contentW + 2;
        const tw = tape.tapeW;

        for (let j = 0; j < tape.segments.length; j++) {
          const seg = tape.segments[j];
          const le = tape.leftEdges[j];
          if (seg === undefined || le === undefined) continue;
          const kMin = Math.floor((scroll - le - contentW - 320) / tw) - 2;
          const kMax = Math.floor((scroll - le + tw + 320) / tw) + 2;
          for (let k = kMin; k <= kMax; k++) {
            const cx = contentLeft + le + k * tw - scroll + padX;
            const cw = seg.width - padX * 2;
            if (cx + cw < minX || cx > maxX) continue;
            paintSegmentClip(i, cx, cy, cw, ch, seg.seed, t);
          }
        }
        ctx.restore();
      }

      const playX =
        contentLeft + (Math.sin(t * 0.8) * 0.5 + 0.5) * (contentW - 4) + 2;
      const pyTop = timelineTop;
      const pyBot = tracksTop + trackCount * (trackH + trackGap) - trackGap;

      ctx.strokeStyle = COL.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, pyTop);
      ctx.lineTo(playX, pyBot);
      ctx.stroke();

      ctx.fillStyle = COL.playhead;
      ctx.beginPath();
      ctx.moveTo(playX - 6, pyTop + 2);
      ctx.lineTo(playX + 6, pyTop + 2);
      ctx.lineTo(playX, pyTop + 10);
      ctx.closePath();
      ctx.fill();
    }

    function drawMainPanels() {
      const { chromeH, leftW, midW, rightW, mainH } = layout();
      const y0 = chromeH;
      const ph = mainH - 4;
      const xL = 0;
      const xM = leftW;
      const xR = leftW + midW;

      drawMediaLibrary(xL, y0, leftW, ph);
      drawPreview(xM, y0, midW, ph);
      drawProperties(xR, y0, rightW, ph);

      ctx.strokeStyle = COL.panelBorder;
      ctx.beginPath();
      ctx.moveTo(leftW, y0);
      ctx.lineTo(leftW, y0 + ph);
      ctx.moveTo(leftW + midW, y0);
      ctx.lineTo(leftW + midW, y0 + ph);
      ctx.stroke();
    }

    function drawScene(now: number) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);

      drawChrome();
      drawMainPanels();
      drawTimeline(now);
    }

    function drawStatic() {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      drawChrome();
      const { chromeH, leftW, midW, rightW, mainH } = layout();
      const y0 = chromeH;
      const ph = mainH - 4;
      drawMediaLibrary(0, y0, leftW, ph);
      drawPreview(leftW, y0, midW, ph);
      drawProperties(leftW + midW, y0, rightW, ph);

      const { timelineTop, timelineH, labelCol } = layout();
      const rulerH = Math.max(22, timelineH * 0.12);
      const tracksAreaH = timelineH - rulerH;
      const trackCount = 6;
      const trackGap = 3;
      const trackH = Math.max(14, (tracksAreaH - trackGap * (trackCount - 1)) / trackCount);
      const tracksTop = timelineTop + rulerH + 4;
      const contentLeft = labelCol;
      const contentW = w - contentLeft - 8;

      ctx.fillStyle = COL.rulerBg;
      ctx.fillRect(0, timelineTop, w, rulerH);
      const staticT = 0;
      const staticScrolls = [140, 210, 165, 235, 188, 152];
      for (let i = 0; i < trackCount; i++) {
        const ty = tracksTop + i * (trackH + trackGap);
        const label = TRACK_LABELS[i] ?? '';
        ctx.fillStyle = 'rgba(10,10,15,0.95)';
        ctx.fillRect(4, ty, labelCol - 8, trackH);
        ctx.strokeStyle = COL.panelBorder;
        ctx.strokeRect(4, ty, labelCol - 8, trackH);
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 4 + (labelCol - 8) * 0.5, ty + trackH * 0.5);
        ctx.textAlign = 'left';

        const tape = trackTapes[i];
        const scroll = staticScrolls[i] ?? 0;
        if (!tape || tape.tapeW <= 0) continue;

        ctx.strokeStyle = COL.panelBorder;
        ctx.strokeRect(contentLeft, ty, contentW, trackH);

        ctx.save();
        ctx.beginPath();
        ctx.rect(contentLeft + 0.5, ty + 0.5, contentW - 1, trackH - 1);
        ctx.clip();

        const ch = trackH - 4;
        const cy = ty + 2;
        const padX = 2;
        const minX = contentLeft - 2;
        const maxX = contentLeft + contentW + 2;
        const tw = tape.tapeW;

        for (let j = 0; j < tape.segments.length; j++) {
          const seg = tape.segments[j];
          const le = tape.leftEdges[j];
          if (seg === undefined || le === undefined) continue;
          const kMin = Math.floor((scroll - le - contentW - 320) / tw) - 2;
          const kMax = Math.floor((scroll - le + tw + 320) / tw) + 2;
          for (let k = kMin; k <= kMax; k++) {
            const cx = contentLeft + le + k * tw - scroll + padX;
            const cw = seg.width - padX * 2;
            if (cx + cw < minX || cx > maxX) continue;
            paintSegmentClip(i, cx, cy, cw, ch, seg.seed, staticT);
          }
        }
        ctx.restore();
      }
      const playX = contentLeft + contentW * 0.42;
      ctx.strokeStyle = COL.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, timelineTop);
      ctx.lineTo(playX, tracksTop + trackCount * (trackH + trackGap) - trackGap);
      ctx.stroke();
    }

    function frame(now: number) {
      drawScene(now);
      rafRef.current = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotionRef.current) paintReduced();
    });
    ro.observe(canvasEl);
    resize();

    function paintReduced() {
      if (!reducedMotionRef.current) return;
      drawStatic();
    }

    if (reducedMotionRef.current) paintReduced();
    else rafRef.current = requestAnimationFrame(frame);

    return () => {
      mq.removeEventListener('change', onMq);
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
