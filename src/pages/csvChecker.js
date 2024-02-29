import React, { useState, useEffect, useCallback } from "react";
import CsvCheckerStyles from "./csvChecker.module.css";
import DataUploadButton from "../components/DataUploadButton/dataUploadButton";
import StatisticsDisplay from "../components/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../components/ToolTray/toolTray";
import EntrySearch from "../components/EntrySearch/entrySearch";
import DragAndDropOverlay from "../components/DragAndDropOverlay/dragAndDropOverlay";
import { CSSTransition } from 'react-transition-group';
import { uploadFile, logError } from "../util/petitionHandler";

function CsvChecker() {
    const [file, setFile] = useState(null);
    const [dataStatistics, setDataStatistics] = useState(null);
    const [filteredDataStatistics, setFilteredDataStatistics] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    // Prevent the overlay from flickering
    const [dragCounter, setDragCounter] = useState(0);
    const isDragOver = dragCounter > 0;

    // Graph control hooks
    const [showOutliers, setShowOutliers] = useState(false);
    const [isToolTrayOpen, setIsToolTrayOpen] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const toggleToolTray = () => setIsToolTrayOpen(!isToolTrayOpen);

    console.log(selectedEntry)
    useEffect(() => {
        const upload = async () => {
            if (file) {
                setUploadStatus(`Uploading ${file.name}...`);
                setErrorMessage('');
                try {
                    const data = await uploadFile(file);
                    setUploadStatus('Upload successful!');
                    setDataStatistics(data);
                    setFilteredDataStatistics(data);
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
        <div className={CsvCheckerStyles.dropContainer}>
            <DragAndDropOverlay onDrop={handleFilesSelected} isVisible={isDragOver} />
            {!filteredDataStatistics && (
                <DataUploadButton
                    onFileSelected={handleFilesSelected}
                    uploadStatus={uploadStatus}
                    errorMessage={errorMessage}
                />
            )}
            <CSSTransition
                in={!!filteredDataStatistics}
                classNames={{
                    enter: CsvCheckerStyles.statisticsEnter,
                    enterActive: CsvCheckerStyles.statisticsEnterActive,
                    exit: CsvCheckerStyles.statisticsExit,
                    exitActive: CsvCheckerStyles.statisticsExitActive,
                }}
                timeout={500}
                unmountOnExit
            >
                <StatisticsDisplay data={filteredDataStatistics} showOutliers={showOutliers}
                    onGraphClick={setSelectedEntry} selectedChart={selectedEntry} />
            </CSSTransition>
            <CSSTransition
                in={!!filteredDataStatistics}
                classNames={{
                    enter: CsvCheckerStyles.toolTrayEnter,
                    enterActive: CsvCheckerStyles.toolTrayEnterActive,
                    exit: CsvCheckerStyles.toolTrayExit,
                    exitActive: CsvCheckerStyles.toolTrayExitActive,
                }}
                timeout={300}
                unmountOnExit
            >
                <ToolTray
                    data={dataStatistics}
                    showOutliers={showOutliers}
                    setShowOutliers={setShowOutliers}
                    setFilteredDataStatistics={setFilteredDataStatistics}
                    filteredDataStatistics={filteredDataStatistics}
                    isToolTrayOpen={isToolTrayOpen}
                    toggleToolTray={toggleToolTray}
                    handleFilesSelected={handleFilesSelected}
                    selectedEntry={selectedEntry}
                />
            </CSSTransition>
        </div>
    );
}

export default CsvChecker;
