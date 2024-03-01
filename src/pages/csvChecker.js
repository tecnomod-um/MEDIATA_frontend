import React, { useState, useEffect } from "react";
import CsvCheckerStyles from "./csvChecker.module.css";
import DataUploadButton from "../components/DataUploadButton/dataUploadButton";
import StatisticsDisplay from "../components/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../components/ToolTray/toolTray";
import DragAndDropOverlay from "../components/DragAndDropOverlay/dragAndDropOverlay";
import { CSSTransition } from 'react-transition-group';
import { uploadFile, logError } from "../util/petitionHandler";

function CsvChecker() {
    const [file, setFile] = useState(null);
    const [dataStatistics, setDataStatistics] = useState(null);
    const [filteredDataStatistics, setFilteredDataStatistics] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showOutliers, setShowOutliers] = useState(false);
    const [isToolTrayOpen, setIsToolTrayOpen] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const toggleToolTray = () => setIsToolTrayOpen(!isToolTrayOpen);

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

    const handleFilesSelected = (file) => {
        setFile(file);
    }

    return (
        <div className={CsvCheckerStyles.dropContainer}>
            <DragAndDropOverlay onDrop={handleFilesSelected} />
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
