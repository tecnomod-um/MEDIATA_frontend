import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import SemanticIntegrationStyles from "./semanticIntegration.module.css";
import RdfSidebar from "../../components/SemanticIntegration/RdfSidebar/rdfSidebar";
import ElementDetailPanel from "../../components/SemanticIntegration/ElementDetailPanel/elementDetailPanel";
import RdfConnection from "../../components/SemanticIntegration/RdfCard/rdfConnection";
import RdfCard from "../../components/SemanticIntegration/RdfCard/rdfCard";
import UploadFilePicker from "../../components/Common/FilePicker/uploadFilePicker";
import { generateDistinctColors } from "../../util/colors";
import {
  getSemanticCdeDatasetMatches,
  getNodeDatasets,
  processSemanticCdeDataset,
  scoreSemanticCdeCandidates,
  uploadSemanticMappingCsv,
} from "../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../util/nodeAxiosSetup";
import { useNode } from "../../context/nodeContext";
import { toast, ToastContainer } from "react-toastify";

const normalizeDatasetName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getNodeDisplayName = (node) => node?.name || node?.nodeName || node?.serviceUrl || "Node";

const getNodeServiceUrl = (node) => node?.serviceUrl || node?.ip || node?.url;

const getDatasetFileName = (dataset) => {
  if (typeof dataset === "string") return dataset;
  return dataset?.fileName || dataset?.name || dataset?.title || "";
};

const buildSemanticCdeOutputName = (datasetFileName, conversion) => {
  const stem = String(datasetFileName || "dataset")
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_");
  if (Array.isArray(conversion.mappingIds) && conversion.mappingIds.length > 1) {
    return `${stem}-${conversion.outputSuffix}`;
  }
  const extension = normalizeDatasetName(conversion.target).includes("sulo") ? "ttl" : "json";
  return `${stem}-${conversion.outputSuffix}.${extension}`;
};

const useStableEvent = (handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  return useCallback((...args) => handlerRef.current(...args), []);
};

// Semantic integration page for RDF mapping and ontology connections
function SemanticIntegration() {
  const location = useLocation();
  const { selectedNodes = [] } = useNode() || {};
  const workspaceRef = useRef(null);
  const hiddenFileInput = useRef(null);
  const [cards, setCards] = useState([]);
  const [connections, setConnections] = useState([]);
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [tempFromCard, setTempFromCard] = useState(null);
  const [elements, setElements] = useState(null);
  const [activeElementIndex, setActiveElementIndex] = useState(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(null);
  const [elementSelections, setElementSelections] = useState({});
  const [elementFormValues, setElementFormValues] = useState({});
  const [builtClasses, setBuiltClasses] = useState({});
  const [zoom, setZoom] = useState(1);
  const [middlePanelWidth, setMiddlePanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState("detail");
  const [registryCheck, setRegistryCheck] = useState({
    status: "idle",
    matches: [],
    error: null,
  });
  const [semanticCdeProcessingKey, setSemanticCdeProcessingKey] = useState(null);

  const selectedNodesKey = useMemo(
    () => selectedNodes.map((node) => `${node.nodeId || node.id || ""}:${getNodeServiceUrl(node) || ""}`).join("|"),
    [selectedNodes]
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const processCsvData = useCallback((csvString) => {
    if (elements) return;
    const lines = csvString.split(/\r?\n/).filter((line) => line.trim() !== "");
    const reservedTypes = ["integer", "double", "date"];
    const parsedElements = lines
      .map((line) => {
        const columns = line.split(",").map((col) => col.trim());
        const name = columns[0];
        if (!name) return null;
        if (columns.length > 1 && reservedTypes.includes(columns[1].toLowerCase())) {
          return { name, type: columns[1].toLowerCase() };
        } else if (columns.length > 1) {
          const categories = columns.slice(1).filter((col) => col !== "");
          return { name, categories };
        } else {
          return { name };
        }
      })
      .filter((item) => item !== null);

    setElements({ elements: parsedElements });
    if (parsedElements.length > 0) {

      /*
      setActiveElementIndex(0);
      setActiveCategoryIndex(
        parsedElements[0].categories && parsedElements[0].categories.length > 0 ? 0 : null
      );
      */
      setActiveElementIndex(0);
      setActiveCategoryIndex(null);
      const defaultSelections = {};
      parsedElements.forEach((el, i) => {
        if (el.categories && el.categories.length > 0) {
          defaultSelections[`${i}`] = { label: el.categories[0] };
        } else {
          defaultSelections[`${i}`] = { label: el.name };
        }
      });
      setElementSelections(defaultSelections);
    }
  }, [elements]);
  useEffect(() => {
    if (location.state?.csvData) {
      try {
        const csvString = atob(location.state.csvData);
        processCsvData(csvString);
      } catch (error) {
        console.error("Error loading CSV from navigation:", error);
      }
    }
  }, [location.state, processCsvData]);

  useEffect(() => {
    let cancelled = false;

    const checkRegistryCompatibility = async () => {
      if (!Array.isArray(selectedNodes) || selectedNodes.length === 0) {
        setRegistryCheck({ status: "idle", matches: [], error: null });
        return;
      }

      setRegistryCheck({ status: "checking", matches: [], error: null });

      try {
        const matches = [];
        for (const node of selectedNodes) {
          const serviceUrl = getNodeServiceUrl(node);
          if (!serviceUrl) continue;

          updateNodeAxiosBaseURL(serviceUrl);
          const datasets = await getNodeDatasets();
          const datasetNames = (Array.isArray(datasets) ? datasets : [])
            .map(getDatasetFileName)
            .filter(Boolean);

          for (const datasetFileName of datasetNames) {
            const nodeMatches = await getSemanticCdeDatasetMatches(datasetFileName);
            const candidates = Array.isArray(nodeMatches) ? nodeMatches : [];
            if (candidates.length === 0) continue;

            const scoreResults = await scoreSemanticCdeCandidates({
              datasetFields: candidates[0]?.datasetFields || [],
              candidates: candidates.map((match) => ({
                semanticCdePath: match.semanticCdePath,
                descriptions: match.semanticDescriptions || [],
                lexicalScore: match.lexicalScore,
                lexicalMatch: Boolean(match.lexicalMatch),
              })),
            });
            const scoresByPath = new Map(
              (Array.isArray(scoreResults) ? scoreResults : [])
                .map((score) => [score.semanticCdePath, score])
            );

            candidates
              .filter((match) => scoresByPath.get(match.semanticCdePath)?.accepted)
              .sort((left, right) => (
                (scoresByPath.get(right.semanticCdePath)?.score || 0)
                - (scoresByPath.get(left.semanticCdePath)?.score || 0)
              ))
              .forEach((match) => {
                if (!Array.isArray(match.conversions) || match.conversions.length === 0) return;
                matches.push({
                  node,
                  serviceUrl,
                  datasetFileName: match.datasetFileName || datasetFileName,
                  entry: {
                    title: match.title,
                    semanticCdePath: match.semanticCdePath,
                  },
                  conversions: match.conversions,
                  candidateScore: scoresByPath.get(match.semanticCdePath),
                });
              });
          }
        }

        if (!cancelled) {
          setRegistryCheck({ status: "ready", matches, error: null });
        }
      } catch (error) {
        console.error("Error checking Semantic-CDE registry compatibility:", error);
        if (!cancelled) {
          setRegistryCheck({
            status: "error",
            matches: [],
            error: error.message || "Unable to check Semantic-CDE registry compatibility.",
          });
        }
      }
    };

    checkRegistryCompatibility();
    return () => {
      cancelled = true;
    };
  }, [selectedNodes, selectedNodesKey]);



  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      processCsvData(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleFileClick = () => {
    hiddenFileInput.current?.click();
  };

  const handleRemoveConnection = () => {
    if (connections.length === 0) return;
    setConnections((prev) => prev.slice(0, -1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleProcess = () => {
    console.log("Processing...", { cards, connections });
  };

  const handleSemanticCdeConversion = async (match, conversion) => {
    const processingKey = `${match.serviceUrl}:${match.datasetFileName}:${conversion.id}`;
    setSemanticCdeProcessingKey(processingKey);

    try {
      updateNodeAxiosBaseURL(match.serviceUrl);
      const result = await processSemanticCdeDataset({
        datasetFileName: match.datasetFileName,
        semanticCdePath: match.entry.semanticCdePath,
        mappingIds: Array.isArray(conversion.mappingIds) && conversion.mappingIds.length > 0
          ? conversion.mappingIds
          : [conversion.id],
        outputFileName: buildSemanticCdeOutputName(match.datasetFileName, conversion),
      });

      if (result?.success) {
        toast.success(
          `Converted ${match.datasetFileName} to ${conversion.target}: ${(result.outputFiles || []).join(", ")}`
        );
      } else {
        toast.error(result?.message || `Semantic-CDE conversion failed for ${match.datasetFileName}.`);
      }
    } catch (error) {
      console.error("Error processing Semantic-CDE conversion:", error);
      toast.error(error?.response?.data?.error || error.message || "Semantic-CDE conversion failed.");
    } finally {
      setSemanticCdeProcessingKey(null);
    }
  };

  const renderRegistryConversionPanel = () => {
    if (!Array.isArray(selectedNodes) || selectedNodes.length === 0) return null;

    return (
      <section className={SemanticIntegrationStyles.registryPanel} aria-label="Semantic-CDE registry conversions">
        <div className={SemanticIntegrationStyles.registryPanelHeader}>
          <div>
            <p className={SemanticIntegrationStyles.registryEyebrow}>Semantic-CDE registry</p>
            <p className={SemanticIntegrationStyles.registryIntro}>
              These datasets match published Semantic-CDE entries and can be aligned directly.
            </p>
          </div>
          <span className={SemanticIntegrationStyles.registryStatus}>
            {registryCheck.status === "checking"
              ? "Checking registry"
              : `${registryCheck.matches.length} compatible dataset${registryCheck.matches.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {registryCheck.status === "error" && (
          <p className={SemanticIntegrationStyles.registryMessage}>{registryCheck.error}</p>
        )}

        {registryCheck.status === "ready" && registryCheck.matches.length === 0 && (
          <p className={SemanticIntegrationStyles.registryMessage}>
            No selected-node dataset currently matches a runnable Semantic-CDE registry conversion.
          </p>
        )}

        {registryCheck.status === "checking" && (
          <p className={SemanticIntegrationStyles.registryMessage}>
            Checking selected node datasets against the published Semantic-CDE registry.
          </p>
        )}

        <div className={SemanticIntegrationStyles.registryMatchList}>
          {registryCheck.matches.map((match) => (
            <article
              key={`${match.serviceUrl}:${match.datasetFileName}:${match.entry.semanticCdePath}`}
              className={SemanticIntegrationStyles.registryMatchCard}
            >
              <div className={SemanticIntegrationStyles.registryMatchMeta}>
                <span className={SemanticIntegrationStyles.registryNodeName}>{getNodeDisplayName(match.node)}</span>
                <strong>{match.datasetFileName}</strong>
                <small>{match.entry.title}</small>
              </div>
              <div className={SemanticIntegrationStyles.registryActions}>
                {match.conversions.map((conversion) => {
                  const processingKey = `${match.serviceUrl}:${match.datasetFileName}:${conversion.id}`;
                  const isProcessing = semanticCdeProcessingKey === processingKey;
                  return (
                    <button
                      key={conversion.id}
                      type="button"
                      className={SemanticIntegrationStyles.registryConvertButton}
                      onClick={() => handleSemanticCdeConversion(match, conversion)}
                      disabled={Boolean(semanticCdeProcessingKey)}
                      title={conversion.description}
                    >
                      {isProcessing ? "Aligning..." : `Align to ${conversion.target}`}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  };

  const { allBuilt, missingKeys } = useMemo(() => {
    if (!elements) return { allBuilt: false, missingKeys: [] };
    const expectedKeys = elements.elements.map((_, i) => `${i}`);
    const missing = expectedKeys.filter((key) => !builtClasses[key]);
    return {
      allBuilt: missing.length === 0,
      missingKeys: missing,
    };
  }, [elements, builtClasses]);

  const handleDownloadCsv = async () => {
    if (!allBuilt) {
      const missingNames = missingKeys.map((key) => {
        if (key.includes("-cat-")) {
          const [ei, ci] = key.split("-cat-").map(Number);
          return elements.elements[ei].categories[ci];
        } else
          return elements.elements[Number(key)].name;
      });
      return alert(`Please build mappings for: ${missingNames.join(", ")}`);
    }


    const dynamicFields = Array.from(new Set(cards.flatMap((card) => card.fields)));
    const header = [
      "field_id",
      "pattern_type",
      ...dynamicFields,
      "value_type",
      "categorical_value",
      "categorical_ontology_mapping"
    ];

    const rows = [];
    cards.forEach((card) => {
      const base = {
        field_id: card.elementName,
        pattern_type: card.optionLabel,
        ...dynamicFields.reduce((acc, f) => {
          acc[f] = card.inputs[f] ?? "";
          return acc;
        }, {}),
        // inject the chosen “kind” (integer, date, boolean, categorical…)
        value_type: card.inputs["value_type_kind"] || ""
      };

      if (card.inputs["value_type_kind"] === "categorical") {
        (card.inputs["value_type_categories"] || []).forEach(([cat, onto]) => {
          rows.push({
            ...base,
            categorical_value: cat,
            categorical_ontology_mapping: onto
          })
        });
      } else {
        rows.push({
          ...base,
          categorical_value: "",
          categorical_ontology_mapping: ""
        });
      }
    });

    const csv = header.join(",") + "\n" + rows.map((r) => header.map((col) => {
      const v = r[col] ?? "";
      return v.includes(",") ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",")).join("\n");

    let result;

    try {
      result = await uploadSemanticMappingCsv(csv);
    } catch (err) {
      toast.error("Network error: " + (err.message || err));
      return;
    }

    console.log(result)
    if (result.csvSaved)
      toast.success(result.csvMessage);
    else
      toast.error(result.csvMessage);

    if (result.rdfGenerated) {
      let msg;
      try {
        msg = JSON.parse(result.rdfMessage).message;
      } catch {
        msg = result.rdfMessage;
      }
      toast.success(msg);
    } else
      toast.error(result.rdfMessage);


    if (result.csvSaved) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "semantic_mapping.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSelectElement = (elementIndex, categoryIndex) => {
    setActiveElementIndex(elementIndex);
    setActiveCategoryIndex(categoryIndex ?? null);
    if (isMobile) {
      setMobileView("detail");
    }
  };
  const activeItem = useMemo(() => {
    if (!elements || activeElementIndex == null) return null;
    return { ...elements.elements[activeElementIndex], isCategory: false };
  }, [activeElementIndex, elements]);

  /*
    const getActiveItem = () => {
      if (!elements || activeElementIndex == null) return null;
      const parent = elements.elements[activeElementIndex];
      if (!parent) return null;
      if (
        activeCategoryIndex != null &&
        parent.categories &&
        parent.categories[activeCategoryIndex]
      ) {
        return {
          name: parent.categories[activeCategoryIndex],
          isCategory: true,
        };
      }
      return { ...parent, isCategory: false };
    };
  */
  const handleBuildClass = (formFields) => {
    if (!activeItem || activeElementIndex === null) return;
    const itemKey =
      activeCategoryIndex != null
        ? `${activeElementIndex}-cat-${activeCategoryIndex}`
        : `${activeElementIndex}`;
    if (builtClasses[itemKey]) return;

    const optionLabel =
      (elementSelections[itemKey] && elementSelections[itemKey].label) || activeItem.name;

    const allOptionLabels = Object.values(elementSelections)
      .map((o) => (o && o.label ? o.label : null))
      .filter(Boolean);
    if (!allOptionLabels.includes(optionLabel)) {
      allOptionLabels.push(optionLabel);
    }
    const uniqueLabels = [...new Set(allOptionLabels)];
    const colors = generateDistinctColors(uniqueLabels.length);
    const colorIndex = uniqueLabels.indexOf(optionLabel);
    const optionColor = colors[colorIndex] || "#007bff";

    const spawnX = 50;
    const spawnY = 50;
    const randomOffsetX = Math.floor(Math.random() * 100);
    const randomOffsetY = Math.floor(Math.random() * 100);

    const newCard = {
      id: Date.now(),
      x: spawnX + randomOffsetX,
      y: spawnY + randomOffsetY,
      elementName: activeItem.name,
      optionLabel: optionLabel,
      optionColor,
      builtKey: itemKey,
      inputs: elementFormValues[itemKey] || {},
      fields: formFields.map((f) => f.name),
    };

    setCards((prev) => [...prev, newCard]);
    setBuiltClasses((prev) => ({ ...prev, [itemKey]: true }));
  };

  const handleRemoveCard = (cardId) => {
    const cardToRemove = cards.find((card) => card.id === cardId);
    if (!cardToRemove) return;
    setCards((prev) => prev.filter((card) => card.id !== cardId));
    setBuiltClasses((prev) => {
      const newBuilt = { ...prev };
      delete newBuilt[cardToRemove.builtKey];
      return newBuilt;
    });
  };

  const handleMouseDownCard = (e, cardId) => {
    if (isConnecting) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const scaledX = e.clientX / zoom;
    const scaledY = e.clientY / zoom;
    const offsetX = scaledX - card.x;
    const offsetY = scaledY - card.y;
    setDraggingCardId(cardId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingCardId === null || isResizing) return;
      const scaledX = e.clientX / zoom;
      const scaledY = e.clientY / zoom;
      const newX = scaledX - dragOffset.x;
      const newY = scaledY - dragOffset.y;
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === draggingCardId ? { ...card, x: newX, y: newY } : card
        )
      );
    };

    const handleMouseUp = () => {
      setDraggingCardId(null);
    };

    const handleTouchMove = (e) => {
      if (draggingCardId === null || isResizing) return;
      const touch = e.touches[0];
      const scaledX = touch.clientX / zoom;
      const scaledY = touch.clientY / zoom;
      const newX = scaledX - dragOffset.x;
      const newY = scaledY - dragOffset.y;
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === draggingCardId ? { ...card, x: newX, y: newY } : card
        )
      );
    };

    const handleTouchEnd = () => {
      setDraggingCardId(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [draggingCardId, dragOffset, isResizing, zoom]);

  const handleTouchStartCard = (e, cardId) => {
    e.preventDefault();
    const touch = e.touches[0];
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const scaledX = touch.clientX / zoom;
    const scaledY = touch.clientY / zoom;
    const offsetX = scaledX - card.x;
    const offsetY = scaledY - card.y;
    setDraggingCardId(cardId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleCardClick = (cardId) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    if (isConnecting) {
      if (!tempFromCard) setTempFromCard(cardId);
      else {
        const newConn = {
          id: Date.now(),
          from: tempFromCard,
          to: cardId,
          property: { label: "<New property>", iri: "<New property>" },
        };
        setConnections((prev) => [...prev, newConn]);
        setIsConnecting(false);
        setTempFromCard(null);
      }
    } else {
      if (card.builtKey.includes("-cat-")) {
        const [elemIndexStr, catIndexStr] = card.builtKey.split("-cat-");
        const elementIndex = parseInt(elemIndexStr, 10);
        const categoryIndex = parseInt(catIndexStr, 10);
        handleSelectElement(elementIndex, categoryIndex);
      } else {
        const elementIndex = parseInt(card.builtKey, 10);
        handleSelectElement(elementIndex, null);
      }
    }
  };

  // Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = 0.1;
    let newZoom = zoom;
    if (e.deltaY > 0) {
      newZoom = Math.max(0.5, zoom - zoomStep);
    } else {
      newZoom = Math.min(2, zoom + zoomStep);
    }
    setZoom(newZoom);
  };

  const handleResizerMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing || !workspaceRef.current) return;

    const handleResizerMove = (e) => {
      e.preventDefault();
      const containerRect = workspaceRef.current.getBoundingClientRect();
      let clientX = e.clientX;
      if (e.touches) {
        clientX = e.touches[0].clientX;
      }
      const offsetX = clientX - containerRect.left;
      const totalWidth = containerRect.width;
      let newWidthPercent = ((offsetX - 0.2 * totalWidth) / totalWidth) * 100;
      newWidthPercent = Math.max(10, Math.min(70, newWidthPercent));
      setMiddlePanelWidth(newWidthPercent);
    };

    const handleResizerEnd = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleResizerMove);
    window.addEventListener("mouseup", handleResizerEnd);
    window.addEventListener("touchmove", handleResizerMove);
    window.addEventListener("touchend", handleResizerEnd);
    window.addEventListener("touchcancel", handleResizerEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizerMove);
      window.removeEventListener("mouseup", handleResizerEnd);
      window.removeEventListener("touchmove", handleResizerMove);
      window.removeEventListener("touchend", handleResizerEnd);
      window.removeEventListener("touchcancel", handleResizerEnd);
    };
  }, [isResizing]);

  const handleDeleteByBuiltKey = (builtKey) => {
    const cardToRemove = cards.find((card) => card.builtKey === builtKey);
    if (cardToRemove) {
      handleRemoveCard(cardToRemove.id);
    }
  };

  const toggleMobileView = () => {
    setMobileView((prev) => (prev === "detail" ? "workspace" : "detail"));
  };

  const selectElement = useStableEvent(handleSelectElement);
  const selectOption = useStableEvent((option) => {
    if (activeElementIndex === null) return;
    const key = activeCategoryIndex != null
      ? `${activeElementIndex}-cat-${activeCategoryIndex}`
      : `${activeElementIndex}`;
    setElementSelections((prev) => ({ ...prev, [key]: option }));
  });
  const buildClass = useStableEvent(handleBuildClass);
  const deleteClass = useStableEvent(handleDeleteByBuiltKey);
  const startCardMouseDrag = useStableEvent(handleMouseDownCard);
  const startCardTouchDrag = useStableEvent(handleTouchStartCard);
  const selectCard = useStableEvent(handleCardClick);
  const removeCard = useStableEvent(handleRemoveCard);

  const renderDesktopLayout = () => {
    return (
      <CSSTransition
        in={!!elements}
        timeout={300}
        classNames={{
          enter: SemanticIntegrationStyles.fadeEnter,
          enterActive: SemanticIntegrationStyles.fadeEnterActive,
          exit: SemanticIntegrationStyles.fadeExit,
          exitActive: SemanticIntegrationStyles.fadeExitActive,
        }}
        unmountOnExit
      >
        <div className={SemanticIntegrationStyles.mainContent} ref={workspaceRef} data-testid="main-content">
          <div className={SemanticIntegrationStyles.leftPanel}>
            {elements && (
              <RdfSidebar
                elements={elements}
                activeElementIndex={activeElementIndex}
                activeCategoryIndex={activeCategoryIndex}
                onSelectElement={selectElement}
                builtClasses={builtClasses}
              />
            )}
          </div>
          <div
            className={SemanticIntegrationStyles.middlePanel}
            style={{ width: `${middlePanelWidth}vw` }}
            data-testid="middle-panel"
          >
            <ElementDetailPanel
              activeElement={activeItem}
              currentSelection={
                elements && activeElementIndex !== null
                  ? elementSelections[
                  activeCategoryIndex != null
                    ? `${activeElementIndex}-cat-${activeCategoryIndex}`
                    : `${activeElementIndex}`
                  ]
                  : null
              }
              onSelectOption={selectOption}
              activeElementIndex={activeElementIndex}
              activeCategoryIndex={activeCategoryIndex}
              elementFormValues={elementFormValues}
              setElementFormValues={setElementFormValues}
              onBuildClass={buildClass}
              onDeleteClass={deleteClass}
              builtClasses={builtClasses}
            />
          </div>
          <div
            className={SemanticIntegrationStyles.resizer}
            role="separator"
            aria-label="Resize middle panel"
            data-testid="resizer"
            onMouseDown={handleResizerMouseDown}
            onTouchStart={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
          <div
            className={SemanticIntegrationStyles.rightPanel}
            style={{
              width: `${100 - 20 - middlePanelWidth}vw`,
            }}
            onWheel={handleWheel}
          >
            <div
              className={SemanticIntegrationStyles.workspaceContent}
              style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
            >
              {isConnecting && (
                <div className={SemanticIntegrationStyles.connectionMessage}>
                  {tempFromCard
                    ? "Select target card to complete connection"
                    : "Select source card to start connection"}
                </div>
              )}
              <RdfConnection connections={connections} cards={cards} zoom={zoom} />
              {cards.map((card) => (
                <RdfCard
                  key={card.id}
                  card={card}
                  onMouseDown={startCardMouseDrag}
                  onTouchStart={startCardTouchDrag}
                  onCardClick={selectCard}
                  onRemoveCard={removeCard}
                />
              ))}
            </div>
            <input
              type="file"
              accept=".csv"
              ref={hiddenFileInput}
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: "none" }}
            />
            <div className={SemanticIntegrationStyles.controls}>
              <div className={SemanticIntegrationStyles.controlsBottom}
                data-testid="controls"
                role="group"
                aria-label="Workspace controls"
              >
                <button
                  onClick={() => {
                    setIsConnecting(true);
                    setTempFromCard(null);
                  }}
                  className={SemanticIntegrationStyles.controlBtn}
                >
                  Create Connection
                </button>
                <button
                  onClick={handleRemoveConnection}
                  className={SemanticIntegrationStyles.controlBtn}
                >
                  Remove Last
                </button>
                <button
                  onClick={handleResetZoom}
                  className={SemanticIntegrationStyles.controlBtn}
                >
                  Reset Zoom
                </button>
                <button
                  onClick={handleFileClick}
                  className={SemanticIntegrationStyles.controlBtn}
                >
                  Upload CSV
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className={SemanticIntegrationStyles.controlBtn}
                >
                  Process
                </button>
              </div>
            </div>
          </div>
        </div>
      </CSSTransition>
    );
  };

  const renderMobileLayout = () => {
    if (!elements) {
      return (
        <UploadFilePicker
          onFileUpload={handleFileUpload}
          isProcessing={false}
          modalTitle="Align datasets"
          modalClassName={SemanticIntegrationStyles.alignModal}
          uploadTitle="Manual alignment"
          uploadDescription="Upload the CSV of mapped dataset elements to build the RDF alignment manually."
          confirmLabel="Open manual alignment"
        >
          {renderRegistryConversionPanel()}
        </UploadFilePicker>
      );
    }

    return (
      <div className={SemanticIntegrationStyles.mobileLayout}>
        <div className={SemanticIntegrationStyles.mobileSidebar}>
          <RdfSidebar
            elements={elements}
            activeElementIndex={activeElementIndex}
            activeCategoryIndex={activeCategoryIndex}
            onSelectElement={selectElement}
            builtClasses={builtClasses}
          />
          <button
            className={SemanticIntegrationStyles.mobileToggleBtn}
            onClick={toggleMobileView}
          >
            {mobileView === "detail" ? "Workspace" : "Details"}
          </button>
        </div>
        <div className={SemanticIntegrationStyles.mobileContent}>
          {mobileView === "detail" && (
            <div className={SemanticIntegrationStyles.mobileDetailWrapper}>
              <ElementDetailPanel
                activeElement={activeItem}
                currentSelection={
                  elements && activeElementIndex !== null
                    ? elementSelections[
                    activeCategoryIndex != null
                      ? `${activeElementIndex}-cat-${activeCategoryIndex}`
                      : `${activeElementIndex}`
                    ]
                    : null
                }
                onSelectOption={selectOption}
                activeElementIndex={activeElementIndex}
                activeCategoryIndex={activeCategoryIndex}
                elementFormValues={elementFormValues}
                setElementFormValues={setElementFormValues}
                onBuildClass={buildClass}
                onDeleteClass={deleteClass}
                builtClasses={builtClasses}
              />
            </div>
          )}
          {mobileView === "workspace" && (
            <div className={SemanticIntegrationStyles.mobileWorkspace}>
              {isConnecting && (
                <div className={SemanticIntegrationStyles.connectionMessage}>
                  {tempFromCard
                    ? "Select target card to complete connection"
                    : "Select source card to start connection"}
                </div>
              )}
              <div
                className={SemanticIntegrationStyles.workspaceContent}
                style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
                onWheel={handleWheel}
              >
                <RdfConnection connections={connections} cards={cards} zoom={zoom} />
                {cards.map((card) => (
                  <RdfCard
                    key={card.id}
                    card={card}
                    onMouseDown={startCardMouseDrag}
                    onTouchStart={startCardTouchDrag}
                    onCardClick={selectCard}
                    onRemoveCard={removeCard}
                  />
                ))}
              </div>

              <div className={SemanticIntegrationStyles.controls}>
                <div className={SemanticIntegrationStyles.controlsBottom}
                  data-testid="controls"
                  role="group"
                  aria-label="Workspace controls"
                >
                  <button
                    onClick={() => {
                      setIsConnecting(true);
                      setTempFromCard(null);
                    }}
                    className={SemanticIntegrationStyles.controlBtn}
                  >
                    Create Connection
                  </button>
                  <button
                    onClick={handleRemoveConnection}
                    className={SemanticIntegrationStyles.controlBtn}
                  >
                    Remove Last
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className={SemanticIntegrationStyles.controlBtn}
                  >
                    Reset Zoom
                  </button>
                  <button
                    onClick={handleFileClick}
                    className={SemanticIntegrationStyles.controlBtn}
                  >
                    Upload CSV
                  </button>
                  <button
                    onClick={handleProcess}
                    className={SemanticIntegrationStyles.controlBtn}
                  >
                    Process
                  </button>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                ref={hiddenFileInput}
                onChange={(e) => handleFileUpload(e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={SemanticIntegrationStyles.container}>
      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        className={SemanticIntegrationStyles.toastContainer}
        toastClassName={SemanticIntegrationStyles.toast}
      />
      {!elements && (
        <UploadFilePicker
          onFileUpload={handleFileUpload}
          isProcessing={false}
          modalTitle="Align datasets"
          modalClassName={SemanticIntegrationStyles.alignModal}
          uploadTitle="Manual alignment"
          uploadDescription="Upload the CSV of mapped dataset elements to build the RDF alignment manually."
          confirmLabel="Open manual alignment"
        >
          {renderRegistryConversionPanel()}
        </UploadFilePicker>
      )}
      {elements && (isMobile ? renderMobileLayout() : renderDesktopLayout())}
    </div>
  );
}

export default SemanticIntegration;
