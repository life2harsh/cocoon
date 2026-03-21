import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
};

type Comet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
};

const STAR_COUNT = 300;

export function NightSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;

    const currentContext = currentCanvas.getContext("2d");
    if (!currentContext) return;

    const canvasElement: HTMLCanvasElement = currentCanvas;
    const ctx: CanvasRenderingContext2D = currentContext;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastCometTime = 0;
    const stars: Star[] = [];
    const comets: Comet[] = [];
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function resize() {
      width = canvasElement.width = window.innerWidth;
      height = canvasElement.height = window.innerHeight;
      stars.length = 0;

      for (let index = 0; index < STAR_COUNT; index += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.4 + 0.3,
          baseAlpha: Math.random() * 0.42 + 0.22,
          pulseSpeed: Math.random() * 0.003 + 0.0015,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function spawnComet() {
      const side = Math.floor(Math.random() * 4);
      const speed = 3 + Math.random() * 4;
      const angle = Math.random() * (Math.PI / 3) - Math.PI / 6;
      let x = 0;
      let y = 0;
      let vx = 0;
      let vy = 0;

      if (side === 0) {
        x = Math.random() * width;
        y = -60;
        vx = Math.sin(angle) * speed;
        vy = Math.cos(angle) * speed;
      } else if (side === 1) {
        x = width + 60;
        y = Math.random() * height;
        vx = -Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else if (side === 2) {
        x = Math.random() * width;
        y = height + 60;
        vx = Math.sin(angle) * speed;
        vy = -Math.cos(angle) * speed;
      } else {
        x = -60;
        y = Math.random() * height;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }

      comets.push({
        x,
        y,
        vx,
        vy,
        length: 120 + Math.random() * 90,
        life: 1,
      });
    }

    function drawBackdrop() {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      const baseGradient = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
      baseGradient.addColorStop(0, "rgba(24, 27, 35, 0.75)");
      baseGradient.addColorStop(0.55, "rgba(9, 11, 18, 0.28)");
      baseGradient.addColorStop(1, "rgba(2, 2, 10, 0)");
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, width, height);
    }

    function animate(time: number) {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      ctx.clearRect(0, 0, width, height);

      if (!isDark) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      drawBackdrop();

      for (const star of stars) {
        const pulse = Math.sin(time * star.pulseSpeed + star.pulseOffset);
        const alpha = Math.max(0.16, Math.min(0.96, star.baseAlpha + pulse * 0.22));

        if (alpha > 0.56) {
          ctx.globalAlpha = (alpha - 0.56) * 0.45;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let index = comets.length - 1; index >= 0; index -= 1) {
        const comet = comets[index];
        const angle = Math.atan2(comet.vy, comet.vx);
        const tailX = comet.x - Math.cos(angle) * comet.length;
        const tailY = comet.y - Math.sin(angle) * comet.length;

        const gradient = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
        gradient.addColorStop(0, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.45, "rgba(255,255,255,0.42)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");

        ctx.globalAlpha = comet.life;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.15;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(comet.x, comet.y);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(comet.x, comet.y, 2, 0, Math.PI * 2);
        ctx.fill();

        comet.x += comet.vx;
        comet.y += comet.vy;
        comet.life -= 0.003;

        if (
          comet.life <= 0 ||
          comet.x < -220 ||
          comet.x > width + 220 ||
          comet.y < -220 ||
          comet.y > height + 220
        ) {
          comets.splice(index, 1);
        }
      }

      if (!motionQuery.matches && time - lastCometTime > 3200 + Math.random() * 5200) {
        spawnComet();
        lastCometTime = time;
      }

      ctx.globalAlpha = 1;
      animationFrame = window.requestAnimationFrame(animate);
    }

    resize();
    animationFrame = window.requestAnimationFrame(animate);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="cocoon-night-sky pointer-events-none fixed inset-0 -z-20 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="cocoon-night-sky__canvas" />
      <div className="cocoon-night-sky__veil" />
    </div>
  );
}
