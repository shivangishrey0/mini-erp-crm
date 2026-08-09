import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export default function AnimatedCounter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 20, stiffness: 100 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = Math.round(latest).toString();
    });
  }, [spring]);

  // No point animating a count-up if the OS asked for reduced motion.
  if (reduceMotion) {
    return <span>{value}</span>;
  }

  return <span ref={ref}>0</span>;
}
