import React, { useState, useEffect } from 'react';
import styles from './progressBar.module.css';

export default function ProgressBar({ active, onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    if (active) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + Math.random() * 15, 100);
          if (next >= 100) {
            clearInterval(timer);
            onComplete?.();
            return 100;
          }
          return next;
        });
      }, 200);
    } else {
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [active, onComplete]);

  return (
    <div className={styles.progressContainer}>
      <div
        className={styles.progressFill}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
