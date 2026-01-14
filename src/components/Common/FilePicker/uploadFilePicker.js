// Upload file picker modal for selecting local files to upload
import React, { useState, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import FilePickerStyles from './filePicker.module.css';

function UploadFilePicker({ onFileUpload, isProcessing = false, modalTitle }) {
  const [file, setFile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const hiddenFileInput = useRef(null);
  const uploadModalRef = useRef(null);

  const handleOpenPicker = () => {
    if (!isProcessing && hiddenFileInput.current)
      hiddenFileInput.current.click();
  };

  const handleKeyDown = (e) => {
    if (isProcessing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenPicker();
    }
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0] ?? null;
    setFile(uploadedFile);
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
        enter: FilePickerStyles.fadeModalEnter,
        enterActive: FilePickerStyles.fadeModalEnterActive,
        exit: FilePickerStyles.fadeModalExit,
        exitActive: FilePickerStyles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div ref={uploadModalRef} className={FilePickerStyles.modalBackground}>
        <div className={FilePickerStyles.uploadModalContainer}>
          <h2>{modalTitle}</h2>
          <div
            className={`
              ${FilePickerStyles.uploadItem}
              ${file ? FilePickerStyles.selected : ''}
              ${isProcessing ? FilePickerStyles.disabledFile : ''}
            `}
            onClick={handleOpenPicker}
            role="button"
            tabIndex={isProcessing ? -1 : 0}
            aria-disabled={isProcessing || undefined}
            aria-label="File selector"
            onKeyDown={handleKeyDown}
          >
            {file ? file.name : 'Click to select file...'}
          </div>
          <input
            type="file"
            ref={hiddenFileInput}
            onChange={handleFileChange}
            className={FilePickerStyles.hiddenFileInput}
            disabled={isProcessing}
            aria-label="Select file"
          />
          <button
            className={FilePickerStyles.confirmButton}
            onClick={handleProcess}
            disabled={isProcessing || !file}
          >
            {isProcessing ? (
              <div className={FilePickerStyles.buttonSpinner}>
                <span className={FilePickerStyles.spinnerIcon} />
                <span>Processing...</span>
              </div>
            ) : ('Upload File')}
          </button>
        </div>
      </div>
    </CSSTransition>
  );
}

export default UploadFilePicker;
