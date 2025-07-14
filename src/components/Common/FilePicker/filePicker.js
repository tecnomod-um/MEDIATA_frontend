import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import styles from './filePicker.module.css';

function FilePicker({ files = [], onFilesSelected, isProcessing = false, modalTitle, preSelectedFiles = {}, autoProcess = false }) {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [showModal] = useState(true);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const fileListRef = useRef(null);
  const modalRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const initialSelections = {};
    files.forEach(node => {
      initialSelections[node.nodeId] = (preSelectedFiles[node.nodeId] && preSelectedFiles[node.nodeId].length > 0)
        ? [...preSelectedFiles[node.nodeId]] : [];
    });
    const hasPreSelection = Object.values(initialSelections).some(arr => arr.length > 0);
    const hasCurrent = Object.values(selectedFiles).some(arr => arr.length > 0);
    if (hasPreSelection && !hasCurrent)
      setSelectedFiles(initialSelections);
  }, [files, preSelectedFiles, selectedFiles]);

  useEffect(() => {
    if (files.length > 0) {
      const timer = setTimeout(() => setFilesLoaded(true), 50);
      return () => clearTimeout(timer);
    }
  }, [files]);

  const handleToggle = (nodeId, fileName) => {
    if (isProcessing) return;
    setSelectedFiles(prev => {
      const nodeFiles = prev[nodeId] || [];
      if (nodeFiles.includes(fileName))
        return { ...prev, [nodeId]: nodeFiles.filter(f => f !== fileName) };
      else
        return { ...prev, [nodeId]: [...nodeFiles, fileName] };
    });
  };

  const handleProcess = useCallback(() => {
    const hasSelection = Object.values(selectedFiles).some(arr => arr.length > 0);
    if (hasSelection) onFilesSelected(selectedFiles);
  }, [selectedFiles, onFilesSelected]);

  useEffect(() => {
    if (autoProcess && filesLoaded && !isProcessing && Object.values(selectedFiles).some(arr => arr.length > 0)) {
      const timer = setTimeout(() => {
        handleProcess();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoProcess, filesLoaded, isProcessing, selectedFiles, handleProcess]);

  return (
    <CSSTransition
      in={showModal}
      timeout={600}
      appear
      nodeRef={modalRef}
      classNames={{
        enter: styles.fadeModalEnter,
        enterActive: styles.fadeModalEnterActive,
        exit: styles.fadeModalExit,
        exitActive: styles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div ref={modalRef} className={styles.modalBackground}>
        <div className={styles.modalContainer}>
          <h2 className={styles.modalTitle}>
            {modalTitle || "Select Files to Process"}
          </h2>
          <CSSTransition
            in={filesLoaded}
            nodeRef={fileListRef}
            timeout={300}
            onEnter={() => {
              if (fileListRef.current) {
                fileListRef.current.style.height = '0px';
                const scrollHeight = fileListRef.current.scrollHeight;
                setTimeout(() => setHeight(scrollHeight), 10);
              }
            }}
            onEntered={() => setHeight('auto')}
            onExit={() => {
              if (fileListRef.current) {
                const scrollHeight = fileListRef.current.scrollHeight;
                setHeight(scrollHeight);
                fileListRef.current.getBoundingClientRect();
              }
            }}
            onExiting={() => setHeight(0)}
            unmountOnExit
            classNames=""
          >
            <div
              ref={fileListRef}
              className={`${styles.fileListWrapperExpanded} ${styles.scrollable}`}
              style={{
                height: height,
                overflow: height === 'auto' ? 'auto' : 'hidden',
                transition: 'height 300ms ease',
              }}
            >
              {(files.length === 0 || files.every(node => !node.files || node.files.length === 0)) ? (
                <div className={styles.noFiles}>No files available</div>
              ) : (
                files.map(node => (
                  <div key={node.nodeId} className={styles.nodeSection}>
                    {files.length > 1 && (
                      <h3 className={styles.nodeTitle}>{node.nodeName}</h3>
                    )}
                    <ul className={styles.fileList}>
                      {node.files.map((file, index) => {
                        const isSelected = (selectedFiles[node.nodeId] || []).includes(file);
                        return (
                          <li
                            key={index}
                            className={`${styles.fileItem} ${isSelected ? styles.selected : ''} ${isProcessing ? styles.disabledFile : ''}`}
                            onClick={() => handleToggle(node.nodeId, file)}
                          >
                            {file}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </CSSTransition>

          <button
            className={styles.confirmButton}
            onClick={handleProcess}
            disabled={isProcessing || !Object.values(selectedFiles).some(arr => arr.length > 0)}
          >
            {isProcessing ? (
              <div className={styles.buttonSpinner}>
                <span className={styles.spinnerIcon}></span>
                <span>Processing...</span>
              </div>
            ) : (
              'Process Selected Files'
            )}
          </button>
        </div>
      </div>
    </CSSTransition>
  );
}

export default FilePicker;
