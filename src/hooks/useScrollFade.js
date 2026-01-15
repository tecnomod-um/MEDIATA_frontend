import { useEffect, useRef, useState } from "react";

// Custom hook for scroll-based fade animation effects
export default function useScrollFade() {
  const ref = useRef(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handle = () => {
      const el = ref.current;
      if (!el) return;

      const { innerHeight } = window;
      const { top, height } = el.getBoundingClientRect();
      const offset = innerHeight - top;

      if (offset > 0 && offset < innerHeight + height)
        setOpacity(Math.min(offset / (innerHeight / 3), 1));
    };

    handle();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, []);

  return { ref, style: { opacity } };
}
