// File picker modal for selecting files from multiple nodes
import React, { useState, useEffect, useCallback, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import LinearProgress from "@mui/material/LinearProgress";
import FilePickerStyles from "./filePicker.module.css";

function FilePicker({ files = [], onFilesSelected, isProcessing = false, modalTitle, preSelectedFiles = {}, autoProcess = false, progressMode = "spinner", progressValue = 0 }) {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [showModal] = useState(true);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const fileListRef = useRef(null);
  const modalRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const initialSelections = {};
    files.forEach((node) => {
      initialSelections[node.nodeId] =
        preSelectedFiles[node.nodeId] && preSelectedFiles[node.nodeId].length > 0
          ? [...preSelectedFiles[node.nodeId]]
          : [];
    });
    const hasPreSelection = Object.values(initialSelections).some((arr) => arr.length > 0);
    const hasCurrent = Object.values(selectedFiles).some((arr) => arr.length > 0);
    if (hasPreSelection && !hasCurrent) setSelectedFiles(initialSelections);
  }, [files, preSelectedFiles, selectedFiles]);

  useEffect(() => {
    if (files.length > 0) {
      const timer = setTimeout(() => setFilesLoaded(true), 50);
      return () => clearTimeout(timer);
    }
  }, [files]);

  const handleToggle = (nodeId, fileName) => {
    if (isProcessing) return;
    setSelectedFiles((prev) => {
      const nodeFiles = prev[nodeId] || [];
      if (nodeFiles.includes(fileName)) {
        return { ...prev, [nodeId]: nodeFiles.filter((f) => f !== fileName) };
      }
      return { ...prev, [nodeId]: [...nodeFiles, fileName] };
    });
  };

  const handleProcess = useCallback(() => {
    const hasSelection = Object.values(selectedFiles).some((arr) => arr.length > 0);
    if (hasSelection) onFilesSelected(selectedFiles);
  }, [selectedFiles, onFilesSelected]);

  useEffect(() => {
    if (
      autoProcess &&
      filesLoaded &&
      !isProcessing &&
      Object.values(selectedFiles).some((arr) => arr.length > 0)
    ) {
      const timer = setTimeout(() => { handleProcess(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoProcess, filesLoaded, isProcessing, selectedFiles, handleProcess]);

  const isBar = isProcessing && progressMode === "bar";
  const safeProgress = Math.max(0, Math.min(100, Number(progressValue) || 0));

  return (
    <CSSTransition
      in={showModal}
      timeout={600}
      appear
      nodeRef={modalRef}
      classNames={{
        enter: FilePickerStyles.fadeModalEnter,
        enterActive: FilePickerStyles.fadeModalEnterActive,
        exit: FilePickerStyles.fadeModalExit,
        exitActive: FilePickerStyles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div 
        ref={modalRef} 
        className={FilePickerStyles.modalBackground}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-picker-title"
        aria-describedby="file-picker-description"
      >
        <div className={FilePickerStyles.modalContainer}>
          <h2 id="file-picker-title" className={FilePickerStyles.modalTitle}>
            {modalTitle || "Select Files to Process"}
          </h2>
          <p id="file-picker-description" className="visually-hidden">
            Select one or more files from the list below to process. Click on a file to select or deselect it.
          </p>

          <CSSTransition
            in={filesLoaded}
            nodeRef={fileListRef}
            timeout={300}
            onEnter={() => {
              if (fileListRef.current) {
                fileListRef.current.style.height = "0px";
                const scrollHeight = fileListRef.current.scrollHeight;
                setTimeout(() => setHeight(scrollHeight), 10);
              }
            }}
            onEntered={() => setHeight("auto")}
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
              className={`${FilePickerStyles.fileListWrapperExpanded} ${FilePickerStyles.scrollable}`}
              style={{
                height: height,
                overflow: height === "auto" ? "auto" : "hidden",
                transition: "height 300ms ease",
              }}
              role="region"
              aria-label="File selection list"
            >
              {files.length === 0 || files.every((node) => !node.files || node.files.length === 0) ? (
                <div 
                  className={FilePickerStyles.noFiles}
                  role="status"
                  aria-live="polite"
                >
                  No files available
                </div>
              ) : (
                files.map((node) => (
                  <div key={node.nodeId} className={FilePickerStyles.nodeSection}>
                    {files.length > 1 && (
                      <h3 
                        id={`node-${node.nodeId}-title`}
                        className={FilePickerStyles.nodeTitle}
                      >
                        {node.nodeName}
                      </h3>
                    )}
                    <ul 
                      className={FilePickerStyles.fileList}
                      role="listbox"
                      aria-labelledby={files.length > 1 ? `node-${node.nodeId}-title` : "file-picker-title"}
                      aria-multiselectable="true"
                    >
                      {node.files.map((file, index) => {
                        const isSelected = (selectedFiles[node.nodeId] || []).includes(file);
                        const fileId = `file-${node.nodeId}-${index}`;
                        return (
                          <li
                            key={index}
                            id={fileId}
                            className={`${FilePickerStyles.fileItem} ${isSelected ? FilePickerStyles.selected : ""
                              } ${isProcessing ? FilePickerStyles.disabledFile : ""}`}
                            onClick={() => handleToggle(node.nodeId, file)}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={isProcessing}
                            tabIndex={isProcessing ? -1 : 0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggle(node.nodeId, file);
                              }
                            }}
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
            id="file-picker-confirm-button"
            className={FilePickerStyles.confirmButton}
            onClick={handleProcess}
            disabled={isProcessing || !Object.values(selectedFiles).some((arr) => arr.length > 0)}
            aria-label={isProcessing ? "Processing files, please wait" : "Process selected files"}
            aria-busy={isProcessing}
            aria-live={isProcessing ? "polite" : "off"}
          >
            {isProcessing ? (
              isBar ? (
                <div style={{ width: "100%" }} role="progressbar" aria-valuenow={safeProgress} aria-valuemin="0" aria-valuemax="100">
                  <LinearProgress
                    variant="determinate"
                    value={safeProgress}
                    sx={{
                      width: "100%",
                      height: 12,
                      borderRadius: 999,
                      "& .MuiLinearProgress-bar": { borderRadius: 999 },
                      backgroundColor: "rgba(255,255,255,0.25)",
                    }}
                  />
                </div>
              ) : (
                <div className={FilePickerStyles.buttonSpinner}>
                  <span className={FilePickerStyles.spinnerIcon} aria-hidden="true"></span>
                  <span>Processing...</span>
                </div>
              )
            ) : (
              "Process Selected Files"
            )}
          </button>
        </div>
      </div>
    </CSSTransition>
  );
}

export default FilePicker;
