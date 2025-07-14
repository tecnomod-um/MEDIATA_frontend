import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';
import Switch from 'react-switch';
import { IoMdClose } from 'react-icons/io';
import { FaFileCsv, FaFileExcel, FaFileAlt, FaBroom } from 'react-icons/fa';
import ArrowBackwardsIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-toastify';
import OverlayWrapper from '../../Unused/OverlayWrapper/overlayWrapper';
import FileMapperModalStyles from './fileMapperModal.module.css';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import { getNodeDatasets } from '../../../util/petitionHandler';
import { dateFormats } from '../../../util/dateFormat';

const FileMapperModal = ({ isOpen, closeModal, mappings, columnsData, nodes = [], onSend, }) => {
  const navigate = useNavigate();
  const popoverRef = useRef(null);
  const cleanButtonRef = useRef(null);

  // Data & datasets
  const [datasetFiles, setDatasetFiles] = useState({});
  const [selectedDatasets, setSelectedDatasets] = useState({});

  // Cleaning toggles
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [removeEmptyRows, setRemoveEmptyRows] = useState(false);
  const [standardizeDates, setStandardizeDates] = useState(false);
  const [selectedDateFormat, setSelectedDateFormat] = useState('YYYY-MM-DD');

  // Drafts for popover
  const [draftRemoveDuplicates, setDraftRemoveDuplicates] = useState(false);
  const [draftRemoveEmptyRows, setDraftRemoveEmptyRows] = useState(false);
  const [draftStandardizeDates, setDraftStandarizeDates] = useState(false);
  const [draftSelectedDateFormat, setDraftSelectedDateFormat] = useState(selectedDateFormat);

  const [showCleanMenu, setShowCleanMenu] = useState(false);
  const [pointerLeft, setPointerLeft] = useState('20%');
  const [isSending, setIsSending] = useState(false);

  const changesApplied = removeDuplicates || removeEmptyRows || standardizeDates;

  // Build map of nodeId → nodeName
  const nodeMap = nodes.reduce((acc, { nodeId, name }) => {
    acc[nodeId] = name;
    return acc;
  }, {});

  // Unique processed files
  const processedFiles = Array.from(
    new Map(
      columnsData.map(({ nodeId, fileName }) => [
        `${nodeId}-${fileName}`,
        { nodeId, fileName },
      ])
    ).values()
  );

  // Fetch available datasets when opened
  useEffect(() => {
    if (!isOpen || nodes.length === 0) {
      setDatasetFiles({});
      setSelectedDatasets({});
      return;
    }

    (async () => {
      try {
        const results = {};
        for (const { nodeId, serviceUrl } of nodes) {
          updateNodeAxiosBaseURL(serviceUrl);
          results[nodeId] = (await getNodeDatasets()) || [];
        }
        setDatasetFiles(results);
        setSelectedDatasets({});
      } catch (err) {
        console.error('Error fetching dataset files for nodes:', err);
      }
    })();
  }, [isOpen, nodes]);

  // Reset draft state whenever popover opens or base state changes
  useEffect(() => {
    if (showCleanMenu) {
      setDraftRemoveDuplicates(removeDuplicates);
      setDraftRemoveEmptyRows(removeEmptyRows);
      setDraftStandarizeDates(standardizeDates);
      setDraftSelectedDateFormat(selectedDateFormat);
    }
  }, [showCleanMenu, removeDuplicates, removeEmptyRows, standardizeDates, selectedDateFormat,]);

  // Position clean-popover arrow
  useEffect(() => {
    if (!showCleanMenu || !cleanButtonRef.current || !popoverRef.current) return;

    const btn = cleanButtonRef.current.getBoundingClientRect();
    const pop = popoverRef.current.getBoundingClientRect();
    const offset = btn.left + btn.width / 2 - pop.left;
    const percent = (offset / pop.width) * 100;
    setPointerLeft(`${percent}%`);
    popoverRef.current.style.setProperty('--clean-button-height', `${btn.height}px`);
  }, [showCleanMenu]);

  // Close popover on outside click
  useEffect(() => {
    if (!showCleanMenu) return;
    const handleOutside = (e) =>
      popoverRef.current &&
      !popoverRef.current.contains(e.target) &&
      setShowCleanMenu(false);

    document.addEventListener('click', handleOutside, true);
    return () => document.removeEventListener('click', handleOutside, true);
  }, [showCleanMenu]);

  const getFileIcon = (name) => {
    const ext = name.toLowerCase();
    if (ext.endsWith('.csv')) return <FaFileCsv />;
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return <FaFileExcel />;
    return <FaFileAlt />;
  };

  const getFileColor = (fileName) => {
    const col = columnsData.find((c) => c.fileName === fileName);
    return col ? col.color : '#ccc';
  };

  const toggleDataset = (file, ds) =>
    setSelectedDatasets((prev) => {
      const list = prev[file] || [];
      const updated = list.includes(ds)
        ? list.filter((x) => x !== ds)
        : [...list, ds];
      return { ...prev, [file]: updated };
    });

  const applyOrRemoveCleaning = () => {
    if (!changesApplied) {
      setRemoveDuplicates(draftRemoveDuplicates);
      setRemoveEmptyRows(draftRemoveEmptyRows);
      setStandardizeDates(draftStandardizeDates);
      setSelectedDateFormat(draftSelectedDateFormat);
    } else {
      // reset all
      setRemoveDuplicates(false);
      setRemoveEmptyRows(false);
      setStandardizeDates(false);
      setSelectedDateFormat('YYYY-MM-DD');
      setDraftRemoveDuplicates(false);
      setDraftRemoveEmptyRows(false);
      setDraftStandarizeDates(false);
      setDraftSelectedDateFormat('YYYY-MM-DD');
    }
  };

  const doSend = async (followUpNavigation) => {
    setIsSending(true);
    try {
      const cleanOpts = {
        removeDuplicates,
        removeEmptyRows,
        standardizeDates,
        dateOutputFormat: selectedDateFormat,
      };
      await onSend(selectedDatasets, mappings, cleanOpts);

      if (followUpNavigation) {
        const newFiles = Object.entries(selectedDatasets).filter(([, arr]) => arr.length).flatMap(([file]) => selectedDatasets[file].map((orig) => {
          const nodeId = columnsData.find((c) => c.fileName === file).nodeId;
          return {
            nodeId,
            fileName: `parsed_${orig.replace(/\.[^/.]+$/, '')}.csv`,
          };
        })
        );
        navigate('/discovery', {
          state: { elementFiles: newFiles, source: 'mapping' },
        });
      }
      closeModal();
    } catch (err) {
      console.error('Error sending mappings:', err);
      toast.error(err.message || 'Failed to apply mappings/cleaning');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={FileMapperModalStyles.fileMapperModal}>
        <header className={FileMapperModalStyles.modalHeader}>
          <h3>Select datasets to change</h3>
          <button
            className={FileMapperModalStyles.closeBtn}
            onClick={closeModal}
            aria-label="Close"
          >
            <IoMdClose />
          </button>
        </header>

        <section className={FileMapperModalStyles.modalContent}>
          {processedFiles.length === 0 ? (
            <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
              No processed element files found.
            </p>
          ) : (
            processedFiles.map(({ fileName, nodeId }) => {
              const color = getFileColor(fileName);
              const selected = selectedDatasets[fileName] || [];
              const dsFiles = datasetFiles[nodeId] || [];
              const nodeName = nodeMap[nodeId] || nodeId;

              return (
                <div
                  key={`${nodeId}-${fileName}`}
                  className={FileMapperModalStyles.mappingItem}
                  style={{ borderTop: `6px solid ${color}` }}
                >
                  <h4>
                    {fileName}{' '}
                    <span style={{ fontSize: '0.8em', color: '#666' }}>
                      (Node: {nodeName})
                    </span>
                  </h4>
                  <div className={FileMapperModalStyles.fileList}>
                    {dsFiles.map((ds) => {
                      const isSel = selected.includes(ds);
                      return (
                        <div
                          key={ds}
                          className={`${FileMapperModalStyles.fileItem} ${isSel ? FileMapperModalStyles.selected : ''
                            }`}
                          onClick={() => toggleDataset(fileName, ds)}
                        >
                          <span
                            className={`${FileMapperModalStyles.fileIcon} ${isSel ? FileMapperModalStyles.selectedIcon : ''
                              }`}
                          >
                            {getFileIcon(ds)}
                          </span>
                          <span className={FileMapperModalStyles.fileName}>
                            {ds}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <footer className={FileMapperModalStyles.modalFooter}>
          <div className={FileMapperModalStyles.buttonsContainer}>
            <button
              className={FileMapperModalStyles.arrowButton}
              onClick={() => doSend(true)}
              disabled={
                isSending ||
                Object.values(selectedDatasets).every((arr) => !arr.length)
              }
            >
              <ArrowBackwardsIcon sx={{ fontSize: 16 }} />
            </button>

            <button
              className={FileMapperModalStyles.sendButton}
              onClick={() => doSend(false)}
              disabled={
                isSending ||
                Object.values(selectedDatasets).every((arr) => !arr.length)
              }
            >
              {isSending ? (
                <div className={FileMapperModalStyles.loader} />
              ) : (
                'Apply'
              )}
            </button>

            <button
              ref={cleanButtonRef}
              className={FileMapperModalStyles.cleanButton}
              onClick={() => setShowCleanMenu((v) => !v)}
              disabled={
                isSending ||
                Object.values(selectedDatasets).every((arr) => !arr.length)
              }
            >
              <span className={FileMapperModalStyles.cleanIcon}>
                <FaBroom />
              </span>
              <span className={FileMapperModalStyles.cleanText}>
                Data cleaning
              </span>
            </button>

            <CSSTransition
              in={showCleanMenu}
              timeout={350}
              classNames={{
                enter: FileMapperModalStyles.cleanEnter,
                enterActive: FileMapperModalStyles.cleanEnterActive,
                exit: FileMapperModalStyles.cleanExit,
                exitActive: FileMapperModalStyles.cleanExitActive,
              }}
              unmountOnExit
            >
              <div
                ref={popoverRef}
                className={FileMapperModalStyles.cleanPopover}
                style={{ '--clean-pointer-left': pointerLeft }}
              >
                <button
                  className={FileMapperModalStyles.popoverCloseBtn}
                  onClick={() => setShowCleanMenu(false)}
                  aria-label="Close"
                >
                  <IoMdClose />
                </button>

                <div className={FileMapperModalStyles.cleanOptions}>
                  <label>
                    <Switch
                      checked={draftRemoveDuplicates}
                      onChange={() =>
                        setDraftRemoveDuplicates((v) => !v)
                      }
                      height={20}
                      width={40}
                      handleDiameter={16}
                      offColor="#888"
                      onColor="#9ABDDC"
                    />
                    Remove Duplicates
                  </label>
                  <label>
                    <Switch
                      checked={draftRemoveEmptyRows}
                      onChange={() =>
                        setDraftRemoveEmptyRows((v) => !v)
                      }
                      height={20}
                      width={40}
                      handleDiameter={16}
                      offColor="#888"
                      onColor="#9ABDDC"
                    />
                    Remove Empty Rows
                  </label>

                  <label>
                    <Switch
                      checked={draftStandardizeDates}
                      onChange={() =>
                        setDraftStandarizeDates((v) => !v)
                      }
                      height={20}
                      width={40}
                      handleDiameter={16}
                      offColor="#888"
                      onColor="#9ABDDC"
                    />
                    {draftStandardizeDates ? (
                      <select
                        className={FileMapperModalStyles.formatDropdown}
                        value={draftSelectedDateFormat}
                        onChange={(e) =>
                          setDraftSelectedDateFormat(e.target.value)
                        }
                      >
                        <option value="">Select a format</option>
                        {dateFormats.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>) : ('Standardize Dates')}
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '8px', }} >
                  <button className={`${FileMapperModalStyles.cleanMenuButton} ${changesApplied ? FileMapperModalStyles.remove : FileMapperModalStyles.apply}`}
                    onClick={applyOrRemoveCleaning} >
                    {changesApplied ? 'Remove Changes' : 'Confirm'}
                  </button>
                </div>
              </div>
            </CSSTransition>
          </div>
        </footer>
      </div>
    </OverlayWrapper>
  );
}

export default FileMapperModal;
