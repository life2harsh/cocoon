import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

export function InteractiveSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const canAnimateRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    function syncCapability() {
      canAnimateRef.current =
        pointerQuery.matches &&
        !motionQuery.matches &&
        window.innerWidth >= 960;

      if (!canAnimateRef.current && ref.current) {
        ref.current.style.setProperty("--spot-opacity", "0");
        ref.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)";
      }
    }

    syncCapability();
    window.addEventListener("resize", syncCapability);
    motionQuery.addEventListener("change", syncCapability);
    pointerQuery.addEventListener("change", syncCapability);

    return () => {
      window.removeEventListener("resize", syncCapability);
      motionQuery.removeEventListener("change", syncCapability);
      pointerQuery.removeEventListener("change", syncCapability);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function applyPointerTransform() {
    frameRef.current = null;
    if (!ref.current || !pointerRef.current) {
      return;
    }

    const { x, y } = pointerRef.current;
    const rotateX = (0.5 - y) * 6;
    const rotateY = (x - 0.5) * 7.5;

    ref.current.style.setProperty("--spot-x", `${x * 100}%`);
    ref.current.style.setProperty("--spot-y", `${y * 100}%`);
    ref.current.style.setProperty("--spot-opacity", "0.82");
    ref.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-1px)`;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !ref.current || !canAnimateRef.current) return;

    const rect = ref.current.getBoundingClientRect();
    pointerRef.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(applyPointerTransform);
    }
  }

  function handlePointerLeave() {
    if (!ref.current) return;
    pointerRef.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    ref.current.style.setProperty("--spot-opacity", "0");
    ref.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)";
  }

  return (
    <div
      ref={ref}
      className={`cocoon-interactive ${className}`.trim()}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </div>
  );
}
