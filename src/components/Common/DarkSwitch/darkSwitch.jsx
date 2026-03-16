import React, { useState, useEffect } from "react";
import Switch from "react-switch";
import styles from "./darkSwitch.module.css";

// Dark mode toggle switch component. Uses variables in global CSS for colors
function DarkSwitch() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  const offColor = cssVar("--background-nav-and-headers-background-color", "#0b2a33");
  const onColor = cssVar("--background-nav-tool-background-color-active-light", "#1fb6d5");

  useEffect(() => {
    if (isDarkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  return (
    <div className={styles.wrapper}>
      <Switch
        checked={isDarkMode}
        onChange={setIsDarkMode}
        uncheckedIcon={false}
        checkedIcon={false}
        offColor={offColor}
        onColor={onColor}
        offHandleColor="#ffffff"
        onHandleColor="#ffffff"
        width={34}
        height={18}
        handleDiameter={14}
        className={styles.vertical}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      />

    </div>
  );
}

export default DarkSwitch;
