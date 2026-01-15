import React from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ClusterListPanelStyles from './clusterListPanel.module.css';

// List panel component displaying FHIR element clusters
export default function ClusterListPanel({ clusters, onSelectCluster, onMoveElement, isDragging }) {
  return (
    <div
      className={`${ClusterListPanelStyles.wrapper} ${isDragging ? ClusterListPanelStyles.dragOverlay : ''}`}
      data-testid="wrapper"
    >
      <TransitionGroup component="ul" className={ClusterListPanelStyles.list}>
        {clusters.map((cluster) => (
          <CSSTransition
            key={cluster.id}
            timeout={250}
            classNames={{
              enter: ClusterListPanelStyles.itemEnter,
              enterActive: ClusterListPanelStyles.itemEnterActive,
              exit: ClusterListPanelStyles.itemExit,
              exitActive: ClusterListPanelStyles.itemExitActive,
            }}
          >
            <li
              className={ClusterListPanelStyles.item}
              aria-label={cluster.name}
              onClick={() => onSelectCluster(cluster)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const { elementId } = JSON.parse(e.dataTransfer.getData('app/element'));
                onMoveElement(elementId, cluster.id);
              }}
              tabIndex={0}
            >
              <span className={ClusterListPanelStyles.name}>{cluster.name}</span>
              <span className={ClusterListPanelStyles.count}>{cluster.elements.length}</span>
            </li>
          </CSSTransition>
        ))}
      </TransitionGroup>

      <p className={ClusterListPanelStyles.instructions}>
        Drag an element onto a cluster to add it.
      </p>
    </div>
  );
}
