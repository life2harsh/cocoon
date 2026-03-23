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

const MAX_DEVICE_PIXEL_RATIO = 1.4;
const TARGET_FRAME_MS = 1000 / 24;

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
    let backdropGradient: CanvasGradient | null = null;
    let lastCometTime = 0;
    let lastFrameTime = 0;
    let running = false;
    let isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
    const stars: Star[] = [];
    const comets: Comet[] = [];
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const largeViewportQuery = window.matchMedia("(min-width: 900px)");

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

      canvasElement.width = Math.floor(width * devicePixelRatio);
      canvasElement.height = Math.floor(height * devicePixelRatio);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      backdropGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.65,
      );
      backdropGradient.addColorStop(0, "rgba(24, 27, 35, 0.75)");
      backdropGradient.addColorStop(0.55, "rgba(9, 11, 18, 0.28)");
      backdropGradient.addColorStop(1, "rgba(2, 2, 10, 0)");

      stars.length = 0;
      comets.length = 0;

      const starCount = width < 640 ? 110 : width < 1024 ? 150 : 180;
      for (let index = 0; index < starCount; index += 1) {
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
      if (!largeViewportQuery.matches) {
        return;
      }

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
      if (backdropGradient) {
        ctx.fillStyle = backdropGradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    function renderFrame(time: number, animated: boolean) {
      ctx.clearRect(0, 0, width, height);
      if (!isDarkTheme) {
        return;
      }

      drawBackdrop();

      for (const star of stars) {
        const pulse = animated ? Math.sin(time * star.pulseSpeed + star.pulseOffset) : 0;
        const alpha = Math.max(0.16, Math.min(0.96, star.baseAlpha + pulse * 0.18));

        if (alpha > 0.68 && largeViewportQuery.matches) {
          ctx.globalAlpha = (alpha - 0.68) * 0.34;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.8, 0, Math.PI * 2);
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

        if (animated) {
          comet.x += comet.vx;
          comet.y += comet.vy;
          comet.life -= 0.0036;
        }

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

      if (
        animated &&
        !motionQuery.matches &&
        largeViewportQuery.matches &&
        time - lastCometTime > 5200 + Math.random() * 6200
      ) {
        spawnComet();
        lastCometTime = time;
      }

      ctx.globalAlpha = 1;
    }

    function renderStatic() {
      renderFrame(lastFrameTime || performance.now(), false);
    }

    function stopAnimation() {
      running = false;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    }

    function animate(time: number) {
      if (!running) {
        return;
      }

      animationFrame = window.requestAnimationFrame(animate);

      if (time - lastFrameTime < TARGET_FRAME_MS) {
        return;
      }

      lastFrameTime = time;
      renderFrame(time, true);
    }

    function startAnimation() {
      if (running || !isDarkTheme || document.hidden) {
        return;
      }

      running = true;
      animationFrame = window.requestAnimationFrame(animate);
    }

    function syncScene() {
      isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";

      if (!isDarkTheme) {
        stopAnimation();
        ctx.clearRect(0, 0, width, height);
        return;
      }

      if (document.hidden) {
        stopAnimation();
        renderStatic();
        return;
      }

      renderStatic();
      startAnimation();
    }

    resize();
    syncScene();
    window.addEventListener("resize", resize);

    const themeObserver = new MutationObserver(syncScene);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
    });

    function handleEnvironmentChange() {
      syncScene();
    }

    document.addEventListener("visibilitychange", handleEnvironmentChange);
    motionQuery.addEventListener("change", handleEnvironmentChange);
    largeViewportQuery.addEventListener("change", handleEnvironmentChange);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleEnvironmentChange);
      motionQuery.removeEventListener("change", handleEnvironmentChange);
      largeViewportQuery.removeEventListener("change", handleEnvironmentChange);
      themeObserver.disconnect();
      stopAnimation();
    };
  }, []);

  return (
    <div className="cocoon-night-sky pointer-events-none fixed inset-0 -z-20 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="cocoon-night-sky__canvas" />
      <div className="cocoon-night-sky__veil" />
    </div>
  );
}
