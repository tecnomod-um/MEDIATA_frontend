import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CloseIcon from '@mui/icons-material/Close';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import styles from './clusterDetailPanel.module.css';

// Panel component for viewing and editing FHIR cluster details
export default function ClusterDetailPanel({ cluster, allElements, onRemoveElement, onAddElement, onBack, onDragStart, onDragEnd }) {
  const available = allElements.filter(el => !cluster.elements.some(e => e.id === el.id));
  const [toAdd, setToAdd] = useState(available[0]?.id || '');

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <IconButton onClick={onBack} className={styles.backBtn} size="small" aria-label="back" >
          <ArrowBackIosIcon fontSize="small" style={{ color: 'var(--text-color-on-darkbg)' }} />
        </IconButton>
        <h2 className={styles.title}>{cluster.name}</h2>
      </header>
      <section className={styles.listSection}
        aria-label="drop zone"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const { elementId } = JSON.parse(e.dataTransfer.getData('app/element'));
          const el = allElements.find(x => x.id === elementId);
          if (el) onAddElement(el);
          onDragEnd();
        }}
      >
        <TransitionGroup component="ul" className={styles.list}>
          {cluster.elements.map(el => (
            <CSSTransition
              key={el.id}
              timeout={200}
              classNames={{
                enter: styles.itemEnter,
                enterActive: styles.itemEnterActive,
                exit: styles.itemExit,
                exitActive: styles.itemExitActive
              }}
            >
              <li
                className={styles.item}
                draggable
                onDragStart={e => {
                  onDragStart();
                  e.dataTransfer.setData('app/element', JSON.stringify({ elementId: el.id }));
                }}
                onDragEnd={onDragEnd}
              >
                <div className={styles.topRow}>
                  <span className={styles.label}>{el.label}</span>
                  <button
                    onClick={() => onRemoveElement(el.id)}
                    className={styles.remove}
                    aria-label="Remove element"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>
                <div className={styles.descWrapper}>
                  <p className={styles.desc}>{el.description}</p>
                </div>
              </li>
            </CSSTransition>
          ))}
        </TransitionGroup>
      </section>

      <footer className={styles.footer}>
        <div className={styles.addRow}>
          <select
            className={styles.select}
            value={toAdd}
            onChange={e => setToAdd(e.target.value)}
          >
            {available.map(el => (
              <option key={el.id} value={el.id}>{el.label}</option>
            ))}
          </select>
          <button
            className={styles.addBtn}
            onClick={() => {
              const el = allElements.find(x => x.id === parseInt(toAdd, 10));
              if (el) onAddElement(el);
            }}
            disabled={!toAdd}
          >
            + Add
          </button>
        </div>
      </footer>
    </div>
  );
}
