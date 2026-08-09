import { useState } from "react";

// Cursor-following radial-gradient glow, in the style of Aceternity's "Card
// Spotlight". Pure CSS custom property + pointer position, no animation
// library needed for the glow itself - it tracks real cursor input rather
// than auto-playing, so it's left out of the reduced-motion gate.
export default function SpotlightCard({ children, className = "" }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div onMouseMove={handleMouseMove} className={`group relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${pos.x}% ${pos.y}%, rgba(79,70,229,0.12), transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
