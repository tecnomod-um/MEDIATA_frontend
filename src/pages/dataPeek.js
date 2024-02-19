import React, { useState, useEffect, useCallback } from "react";
import DataPeekStyles from "./dataPeek.module.css";
import DataUploadButton from "../components/DataUploadButton/dataUploadButton";
import StatisticsDisplay from "../components/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../components/ToolTray/toolTray";
import DragAndDropOverlay from "../components/DragAndDropOverlay/dragAndDropOverlay";
import { CSSTransition } from 'react-transition-group';
import { uploadFile, logError } from "../util/petitionHandler";

function DataPeek() {
    const [file, setFile] = useState(null);
    const [dataStatistics, setDataStatistics] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    // Prevent the overlay from flickering
    const [dragCounter, setDragCounter] = useState(0);
    const isDragOver = dragCounter > 0;

    useEffect(() => {
        const upload = async () => {
            if (file) {
                setUploadStatus(`Uploading ${file.name}...`);
                setErrorMessage('');
                try {
                    const data = await uploadFile(file);
                    setUploadStatus('Upload successful!');
                    setDataStatistics(data);
                    setFile(null);
                } catch (error) {
                    const errorMsg = error.message || 'Upload failed';
                    setUploadStatus('Upload failed.');
                    setErrorMessage(errorMsg);
                    logError(error, 'File upload failed');
                }
            }
        };
        upload();
    }, [file]);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        setDragCounter(prevCount => prevCount + 1);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragCounter(prevCount => prevCount - 1);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragCounter(0);
    }, []);

    useEffect(() => {
        const handleDragEnterWindow = (e) => handleDragEnter(e);
        const handleDragOverWindow = (e) => handleDragOver(e);
        const handleDragLeaveWindow = (e) => handleDragLeave(e);
        const handleDropWindow = (e) => handleDrop(e);

        window.addEventListener('dragenter', handleDragEnterWindow);
        window.addEventListener('dragover', handleDragOverWindow);
        window.addEventListener('dragleave', handleDragLeaveWindow);
        window.addEventListener('drop', handleDropWindow);

        return () => {
            window.removeEventListener('dragenter', handleDragEnterWindow);
            window.removeEventListener('dragover', handleDragOverWindow);
            window.removeEventListener('dragleave', handleDragLeaveWindow);
            window.removeEventListener('drop', handleDropWindow);
        };
    }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

    const handleFilesSelected = useCallback((file) => {
        setFile(file);
        setDragCounter(0);
    }, []);

    return (
        <div className={DataPeekStyles.dropContainer}>
            <DragAndDropOverlay onDrop={handleFilesSelected} isVisible={isDragOver} />
            <DataUploadButton
                onFileSelected={handleFilesSelected}
                uploadStatus={uploadStatus}
                errorMessage={errorMessage}
            />
            <CSSTransition
                in={!!dataStatistics}
                classNames={{
                    enter: DataPeekStyles.statisticsEnter,
                    enterActive: DataPeekStyles.statisticsEnterActive,
                    exit: DataPeekStyles.statisticsExit,
                    exitActive: DataPeekStyles.statisticsExitActive,
                }}
                timeout={300}
                unmountOnExit
            >
                <StatisticsDisplay data={dataStatistics} />
            </CSSTransition>
            <CSSTransition
                in={!!dataStatistics}
                classNames={{
                    enter: DataPeekStyles.toolTrayEnter,
                    enterActive: DataPeekStyles.toolTrayEnterActive,
                    exit: DataPeekStyles.toolTrayExit,
                    exitActive: DataPeekStyles.toolTrayExitActive,
                }}
                timeout={300}
                unmountOnExit
            >
                <ToolTray data={dataStatistics} />
            </CSSTransition>
        </div>
    );
}

export default DataPeek;
