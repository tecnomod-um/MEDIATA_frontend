// DataUploadButton.js
import React, { useRef } from 'react';
import DataUploadButtonStyles from './dataUploadButton.module.css';

function DataUploadButton({ onFileSelected, uploadStatus, errorMessage }) {
    const fileInputRef = useRef(null);

    const triggerFileSelect = () => fileInputRef.current.click();

    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            onFileSelected(files[0]);
            event.target.value = '';
        }
    };

    return (
        <div className={DataUploadButtonStyles.container}>
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button
                className={`${DataUploadButtonStyles.button} ${DataUploadButtonStyles.big_button}`}
                onClick={triggerFileSelect}
                disabled={uploadStatus.includes('Uploading')}>
                {uploadStatus.includes('Uploading') ? (
                    <div className={DataUploadButtonStyles.spinner}></div>
                ) : (
                    uploadStatus || 'Upload File'
                )}
            </button>
            {errorMessage && <p className={DataUploadButtonStyles.error}>{errorMessage}</p>}
        </div>
    );
}

export default DataUploadButton;
