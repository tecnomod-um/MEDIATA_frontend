// Dark mode toggle switch component
import React, { useState, useEffect } from "react";
import Switch from "react-switch";
import styles from "./darkSwitch.module.css";

function DarkSwitch() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

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
        offColor="#0b2a33"
        onColor="#1fb6d5"
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
