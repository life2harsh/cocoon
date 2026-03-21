import { useRef, type PointerEvent, type ReactNode } from "react";

export function InteractiveSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 9;
    const rotateY = (x - 0.5) * 11;

    ref.current.style.setProperty("--spot-x", `${x * 100}%`);
    ref.current.style.setProperty("--spot-y", `${y * 100}%`);
    ref.current.style.setProperty("--spot-opacity", "1");
    ref.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  }

  function handlePointerLeave() {
    if (!ref.current) return;
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
