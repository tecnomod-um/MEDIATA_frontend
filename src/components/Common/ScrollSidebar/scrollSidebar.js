import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./scrollSidebar.module.css";

export default function ScrollSidebar({ sections = [], offset = 55, maxLines = 2, className, listClassName, itemClassName, activeClassName }) {
  const [active, setActive] = useState(sections[0] || null);
  const activeRef = useRef(active);
  const rafId = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (sections.length) setActive(sections[0]);
  }, [sections]);

  const updateActiveFromScroll = useCallback(() => {
    if (!sections.length) return;

    const anchorY = offset + 1;
    let current = sections[0] || null;

    for (const id of sections) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.getBoundingClientRect().top - anchorY <= 0) current = id;
      else break;
    }

    if (current && current !== activeRef.current) {
      setActive(current);
    }
  }, [sections, offset]);

  useEffect(() => {
    updateActiveFromScroll();

    const onScroll = () => {
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        updateActiveFromScroll();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onScroll);

    const t = setTimeout(updateActiveFromScroll, 300);

    return () => {
      clearTimeout(t);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
  }, [updateActiveFromScroll]);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: "smooth" });

    if (typeof window !== "undefined" && window.history && window.location) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <nav
      className={[styles.nav, className].filter(Boolean).join(" ")}
      aria-label="Section navigation"
      style={{ '--ssb-max-lines': maxLines }}
    >
      <ul className={[styles.list, listClassName].filter(Boolean).join(" ")}>
        {sections.map((id) => {
          const isActive = active === id;
          const label = id.replaceAll("-", " ");
          const liClass = [
            styles.item,
            itemClassName,
            isActive ? styles.active : "",
            isActive && activeClassName ? activeClassName : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={id} className={liClass}>
              <button
                type="button"
                className={styles.button}
                onClick={() => scrollToId(id)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && scrollToId(id)
                }
                aria-current={isActive ? "page" : undefined}
                title={label}
                aria-label={label}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
