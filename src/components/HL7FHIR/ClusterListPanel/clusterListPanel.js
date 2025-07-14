import React from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import styles from './clusterListPanel.module.css';

export default function ClusterListPanel({ clusters, onSelectCluster, onMoveElement, isDragging }) {
  return (
    <div className={`${styles.wrapper} ${isDragging ? styles.dragOverlay : ''}`}>
      <TransitionGroup component="ul" className={styles.list}>
        {clusters.map(cluster => (
          <CSSTransition
            key={cluster.id}
            timeout={250}
            classNames={{
              enter: styles.itemEnter,
              enterActive: styles.itemEnterActive,
              exit: styles.itemExit,
              exitActive: styles.itemExitActive,
            }}
          >
            <li
              className={styles.item}
              onClick={() => onSelectCluster(cluster)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                const { elementId } = JSON.parse(e.dataTransfer.getData('app/element'));
                onMoveElement(elementId, cluster.id);
              }}
              tabIndex={0}
            >
              <span className={styles.name}>{cluster.name}</span>
              <span className={styles.count}>{cluster.elements.length}</span>
            </li>
          </CSSTransition>
        ))}
      </TransitionGroup>

      <p className={styles.instructions}>
        Drag an element onto a cluster to add it.
      </p>
    </div>
  );
}
