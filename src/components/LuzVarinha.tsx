import { useEffect, useRef } from "react";
import gsap from "gsap";

/* =========================================================================
   LUZ DE VARINHA - o cursor vira uma ponta de varinha acesa
   -------------------------------------------------------------------------
   Um brilho quente acompanha o mouse (so transform, na GPU) e solta
   faiscas finas quando ele anda. As faiscas sao um canvas 2D pequeno e o
   laco para sozinho quando nao ha nenhuma viva. So com mouse/trackpad e
   sem "reduzir movimento".
   ========================================================================= */

interface Faisca {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  max: number;
  r: number;
}

const MAX_FAISCAS = 90;

export default function LuzVarinha() {
  const luz = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = luz.current;
    const cv = tela.current;
    if (!fino || calmo || !el || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ajustar = (): void => {
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
    };
    ajustar();
    window.addEventListener("resize", ajustar);

    const irX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const irY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    gsap.set(el, { x: window.innerWidth / 2, y: window.innerHeight * 0.6 });

    const faiscas: Faisca[] = [];
    let ultimo: { x: number; y: number } | null = null;
    let rodando = false;

    const passo = (): void => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = faiscas.length - 1; i >= 0; i--) {
        const f = faiscas[i]!;
        f.vida += 1 / 60;
        if (f.vida >= f.max) {
          faiscas.splice(i, 1);
          continue;
        }
        f.vx *= 0.96;
        f.vy = f.vy * 0.96 + 0.025; // cai devagar, como brasa
        f.x += f.vx;
        f.y += f.vy;
        const k = 1 - f.vida / f.max;
        const r = f.r * (0.4 + 0.6 * k) * dpr;
        const g = ctx.createRadialGradient(f.x * dpr, f.y * dpr, 0, f.x * dpr, f.y * dpr, r * 3);
        g.addColorStop(0, `rgba(255, 236, 196, ${0.95 * k})`);
        g.addColorStop(0.3, `rgba(255, 184, 96, ${0.45 * k})`);
        g.addColorStop(1, "rgba(255, 140, 60, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x * dpr, f.y * dpr, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (faiscas.length === 0) {
        gsap.ticker.remove(passo);
        rodando = false;
      }
    };

    const mover = (e: PointerEvent): void => {
      irX(e.clientX);
      irY(e.clientY);
      if (ultimo) {
        const dx = e.clientX - ultimo.x;
        const dy = e.clientY - ultimo.y;
        const dist = Math.hypot(dx, dy);
        // uma faisca a cada ~14px andados
        const n = Math.min(Math.floor(dist / 14), 4);
        for (let i = 0; i < n && faiscas.length < MAX_FAISCAS; i++) {
          faiscas.push({
            x: e.clientX - (dx * i) / Math.max(n, 1),
            y: e.clientY - (dy * i) / Math.max(n, 1),
            vx: (Math.random() - 0.5) * 0.9 - dx * 0.02,
            vy: (Math.random() - 0.7) * 0.9 - dy * 0.02,
            vida: 0,
            max: 0.5 + Math.random() * 0.7,
            r: 0.8 + Math.random() * 1.4,
          });
        }
        if (n > 0 && !rodando) {
          rodando = true;
          gsap.ticker.add(passo);
        }
      }
      ultimo = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("pointermove", mover, { passive: true });
    gsap.to(el, { autoAlpha: 1, duration: 1.2, ease: "power2.out" });

    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("resize", ajustar);
      gsap.ticker.remove(passo);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <>
      <div className="luz-varinha" ref={luz} aria-hidden="true" />
      <canvas className="faiscas-varinha" ref={tela} aria-hidden="true" />
    </>
  );
}
