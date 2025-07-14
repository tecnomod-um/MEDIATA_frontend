import React, { useState, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import styles from './filePicker.module.css';

function UploadFilePicker({ onFileUpload, isProcessing = false, modalTitle }) {
  const [file, setFile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const hiddenFileInput = useRef(null);
  const uploadModalRef = useRef(null);

  const handleClick = () => {
    if (!isProcessing && hiddenFileInput.current) {
      hiddenFileInput.current.click();
    }
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile || null);
  };

  const handleProcess = () => {
    if (file) {
      onFileUpload(file);
      setShowModal(false);
    }
  };

  return (
    <CSSTransition
      in={showModal}
      timeout={600}
      appear
      nodeRef={uploadModalRef}
      classNames={{
        enter: styles.fadeModalEnter,
        enterActive: styles.fadeModalEnterActive,
        exit: styles.fadeModalExit,
        exitActive: styles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div ref={uploadModalRef} className={styles.modalBackground}>
        <div className={styles.uploadModalContainer}>
          <h2>{modalTitle}</h2>
          <div
            className={`
              ${styles.uploadItem} 
              ${file ? styles.selected : ''} 
              ${isProcessing ? styles.disabledFile : ''}
            `}
            onClick={handleClick}
          >
            {file ? file.name : "Click to select file..."}
          </div>
          <input
            type="file"
            ref={hiddenFileInput}
            onChange={handleFileChange}
            className={styles.hiddenFileInput}
            disabled={isProcessing}
          />
          <button
            className={styles.confirmButton}
            onClick={handleProcess}
            disabled={isProcessing || !file}
          >
            {isProcessing ? (
              <div className={styles.buttonSpinner}>
                <span className={styles.spinnerIcon}></span>
                <span>Processing...</span>
              </div>
            ) : (
              'Upload File'
            )}
          </button>
        </div>
      </div>
    </CSSTransition>
  );
}

export default UploadFilePicker;
