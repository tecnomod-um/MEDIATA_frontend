// HL7 FHIR resource mapping page for healthcare standards
import React, { useState, useMemo } from 'react';
import { CSSTransition } from 'react-transition-group';
import HL7FHIRStyles from './hl7FHIR.module.css';
import UploadFilePicker from '../../components/Common/FilePicker/uploadFilePicker';
import ListPanel from '../../components/HL7FHIR/ListPanel/listPanel';
import ElementForm from '../../components/HL7FHIR/ElementForm/elementForm';
import ClusterListPanel from '../../components/HL7FHIR/ClusterListPanel/clusterListPanel';
import ClusterDetailPanel from '../../components/HL7FHIR/ClusterDetailPanel/clusterDetailPanel';
import { createInitialClusters } from '../../util/petitionHandler';

const KNOWN_TYPES = ['integer', 'double', 'date'];

function parseCsvData(csvData) {
  const lines = csvData.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const firstCols = lines[0].split(',').map(c => c.trim());
  if (firstCols.length > 1 && !KNOWN_TYPES.includes(firstCols[1].toLowerCase())) {
    lines.shift();
  }
  return lines.map((line, idx) => {
    const cols = line.split(',').map(c => c.trim());
    const label = cols[0] || `Element ${idx}`;
    let type = '', data = {};
    if (cols[1] && KNOWN_TYPES.includes(cols[1].toLowerCase())) {
      type = cols[1].toLowerCase();
      if (type === 'integer' || type === 'double') {
        data = { min: cols[2] || '', max: cols[3] || '' };
      } else {
        data = { earliest: cols[2] || '', latest: cols[3] || '' };
      }
    } else {
      type = 'categorical';
      data = { options: cols.slice(1) };
    }
    return { id: idx, label, type, data };
  });
}

export default function HL7FHIR() {
  const [dataFormat, setDataFormat] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [elements, setElements] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [elementFormValues, setElementFormValues] = useState({});
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showClustersPanel, setShowClustersPanel] = useState(false);

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  // 1) CSV upload → parse elements + init form values
  const processCsvData = csvText => {
    const parsed = parseCsvData(csvText);
    setElements(parsed);
    const defaults = {};
    parsed.forEach(el => {
      defaults[el.id] = {
        description: '',
        possibleValues: Array.isArray(el.data.options) ? el.data.options.join(',') : '',
        valueType: el.type
      };
    });
    setElementFormValues(defaults);
    if (parsed.length > 0)
      setSelectedElement(parsed[0]);

    setDataFormat(true);
  }

  const handleFileUpload = file => {
    const reader = new FileReader();
    reader.onload = e => processCsvData(e.target.result);
    reader.readAsText(file);
  };

  // 2) Element selection & form state
  const handleSelectElement = el => {
    setSelectedElement(el);
    setSelectedCluster(null);
  };
  const handleFormChange = (field, value) => {
    if (!selectedElement) return;
    setElementFormValues(prev => ({
      ...prev,
      [selectedElement.id]: {
        ...prev[selectedElement.id],
        [field]: value
      }
    }));
  };

  // 3) detect built classes
  const builtClasses = useMemo(() => {
    const map = {};
    elements.forEach((el, i) => {
      if (elementFormValues[el.id]?.description?.trim()) map[i] = true;
    });
    return map;
  }, [elements, elementFormValues]);
  const allDescribed = elements.length > 0 && elements.every(
    el => elementFormValues[el.id]?.description?.trim() !== ''
  );

  // 4) POST to backend & parse its huge JSON into array form
  const handleCreateClusters = () => {
    const payload = elements.map(el => {
      const fv = elementFormValues[el.id];
      const raw = fv.possibleValues.split(',').map(s => s.trim()).filter(Boolean);
      const values = (fv.valueType === 'integer' || fv.valueType === 'double')
        ? raw.map(v => isNaN(+v) ? v : (fv.valueType === 'integer' ? parseInt(v, 10) : parseFloat(v)))
        : raw;
      return {
        "Attribute name": el.label,
        "Description": fv.description || 'No description available',
        "Type": fv.valueType,
        "Possible values": values
      };
    });

    createInitialClusters(JSON.stringify(payload))
      .then(json => {
        // console.log('Clusters from backend:', json);
        // transform { "Cluster 1": { attr:desc, … }, … } → [{id,name,elements:[{id,label,description}]}]
        const parsed = Object.entries(json).map(([name, attrs], idx) => ({
          id: idx,
          name,
          elements: Object.entries(attrs).map(([label, description], eidx) => ({
            id: `${idx}-${eidx}`,
            label,
            description
          }))
        }));
        setClusters(parsed);
        setShowClustersPanel(true);
      })
      .catch(err => console.error('Cluster fetch error', err));
  };

  // 5) drag‐and‐drop mover
  const handleMoveElement = (elementId, targetClusterId) => {
    setClusters(old => {
      let moved = null;
      // remove from source
      const stripped = old.map(c => {
        const keep = c.elements.filter(el => {
          if (el.id === elementId) {
            moved = el;
            return false;
          }
          return true;
        });
        return { ...c, elements: keep };
      });
      if (!moved) return old;
      // add to target
      return stripped.map(c =>
        c.id === targetClusterId
          ? { ...c, elements: [...c.elements, moved] }
          : c
      );
    });
  };

  return (
    <div className={HL7FHIRStyles.pageContainer}>
      {isDragging && <div className={HL7FHIRStyles.globalOverlay} />}
      {!dataFormat ? (
        <UploadFilePicker
          onFileUpload={handleFileUpload}
          isProcessing={false}
          modalTitle="Upload data format"
        />
      ) : (
        <div className={HL7FHIRStyles.mainContent}>
          <div className={HL7FHIRStyles.leftPanel}>
            <ListPanel
              elements={elements}
              selectedElement={selectedElement}
              builtClasses={builtClasses}
              onSelectElement={handleSelectElement}

              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>

          {/* middle slides in when element picked */}
          <CSSTransition
            in={!!selectedElement}
            timeout={300}
            classNames={{
              enter: HL7FHIRStyles.middleEnter,
              enterActive: HL7FHIRStyles.middleEnterActive,
              exit: HL7FHIRStyles.middleExit,
              exitActive: HL7FHIRStyles.middleExitActive,
            }}
            unmountOnExit
          >
            <div className={HL7FHIRStyles.middlePanel}>
              <ElementForm
                element={selectedElement}
                formValues={elementFormValues[selectedElement?.id] || {}}
                onChange={handleFormChange}
                allDescribed={allDescribed}
                onCreateClusters={handleCreateClusters}
              />
            </div>
          </CSSTransition>

          <div
            className={
              `${HL7FHIRStyles.rightPanel} ` +
              (showClustersPanel ? HL7FHIRStyles.open : '')
            }
          >
            <CSSTransition
              in={showClustersPanel}
              timeout={300}
              classNames={{
                enter: HL7FHIRStyles.rightInnerEnter,
                enterActive: HL7FHIRStyles.rightInnerEnterActive,
                exit: HL7FHIRStyles.rightInnerExit,
                exitActive: HL7FHIRStyles.rightInnerExitActive,
              }}
              unmountOnExit
            >
              <div className={HL7FHIRStyles.rightInner}>
                {!selectedCluster ? (
                  <ClusterListPanel
                    clusters={clusters}
                    onSelectCluster={setSelectedCluster}
                    onRegenerate={() => { }}
                    onMoveElement={handleMoveElement}
                    isDragging={isDragging}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ) : (
                  <ClusterDetailPanel
                    cluster={selectedCluster}
                    allElements={elements}
                    onRemoveElement={id =>
                      setClusters(prev =>
                        prev.map(c =>
                          c.id === selectedCluster.id
                            ? { ...c, elements: c.elements.filter(el => el.id !== id) }
                            : c
                        )
                      )
                    }
                    onAddElement={el =>
                      setClusters(prev =>
                        prev.map(c =>
                          c.id === selectedCluster.id
                            ? { ...c, elements: [...c.elements, el] }
                            : c
                        )
                      )
                    }
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onBack={() => setSelectedCluster(null)}
                  />
                )}
              </div>
            </CSSTransition>
          </div>
        </div>
      )}
    </div>
  );
}
