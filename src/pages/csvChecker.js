import React, { useState, useEffect } from "react";
import CsvCheckerStyles from "./csvChecker.module.css";
import DataUploadButton from "../components/DataUploadButton/dataUploadButton";
import StatisticsDisplay from "../components/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../components/ToolTray/toolTray";
import AggregateDisplay from '../components/AggregatesDisplay/aggregateDisplay';
import DragAndDropOverlay from "../components/DragAndDropOverlay/dragAndDropOverlay";
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { uploadFile, logError } from "../util/petitionHandler";

function CsvChecker() {
    const [file, setFile] = useState(null);
    const [dataStatistics, setDataStatistics] = useState(null);
    const [filteredDataStatistics, setFilteredDataStatistics] = useState(null);
    const [showIndividualView, toggleShownView] = useState(true);
    const [uploadStatus, setUploadStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showOutliers, setShowOutliers] = useState(false);
    const [isToolTrayOpen, setIsToolTrayOpen] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const [filters, setFilters] = useState([]);
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

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (viewportWidth > 768)
            setIsToolTrayOpen(true);
        else
            setIsToolTrayOpen(false);
    }, [viewportWidth]);

    const handleFilesSelected = (file) => {
        setFile(file);
    };

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
                    filteredData={filteredDataStatistics}
                    setFilteredData={setFilteredDataStatistics}
                    setData={setDataStatistics}
                    showOutliers={showOutliers}
                    setShowOutliers={setShowOutliers}
                    isToolTrayOpen={isToolTrayOpen}
                    toggleToolTray={toggleToolTray}
                    handleFilesSelected={handleFilesSelected}
                    selectedEntry={selectedEntry}
                    setSelectedEntry={setSelectedEntry}
                    showIndividualView={showIndividualView}
                    toggleView={() => toggleShownView(currentView => !currentView)}
                    file={file}
                    filters={filters}
                    setFilters={setFilters}
                />
            </CSSTransition>
            <CSSTransition
                in={!!filteredDataStatistics}
                classNames={{
                    enter: CsvCheckerStyles.statisticsEnter,
                    enterActive: CsvCheckerStyles.statisticsEnterActive,
                    exit: CsvCheckerStyles.statisticsExit,
                    exitActive: CsvCheckerStyles.statisticsExitActive,
                }}
                timeout={300}
                unmountOnExit
            >
                <div className={CsvCheckerStyles.statisticsContainer}>
                    <TransitionGroup>
                        {showIndividualView ? (
                            <CSSTransition
                                key="statistics"
                                classNames={{
                                    enter: CsvCheckerStyles.fadeEnter,
                                    enterActive: CsvCheckerStyles.fadeEnterActive,
                                    exit: CsvCheckerStyles.fadeExit,
                                    exitActive: CsvCheckerStyles.fadeExitActive,
                                }}
                                timeout={200}
                            >
                                <div>
                                    <StatisticsDisplay
                                        data={filteredDataStatistics}
                                        showOutliers={showOutliers}
                                        setSelectedEntry={setSelectedEntry}
                                        selectedEntry={selectedEntry}
                                    />
                                </div>
                            </CSSTransition>
                        ) : (
                            <CSSTransition
                                key="aggregate"
                                classNames={{
                                    enter: CsvCheckerStyles.fadeEnter,
                                    enterActive: CsvCheckerStyles.fadeEnterActive,
                                    exit: CsvCheckerStyles.fadeExit,
                                    exitActive: CsvCheckerStyles.fadeExitActive,
                                }}
                                timeout={200}
                            >
                                <div>
                                    <AggregateDisplay
                                        covariances={filteredDataStatistics?.covariances}
                                        pearsonCorrelations={filteredDataStatistics?.pearsonCorrelations}
                                        spearmanCorrelations={filteredDataStatistics?.spearmanCorrelations}
                                        chiSquareTest={filteredDataStatistics?.chiSquareTest}
                                    />
                                </div>
                            </CSSTransition>
                        )}
                    </TransitionGroup>
                </div>
            </CSSTransition>
        </div>
    );
}

export default CsvChecker;
