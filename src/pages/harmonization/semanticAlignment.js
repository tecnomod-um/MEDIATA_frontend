import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import SemanticAlignmentStyles from "./semanticAlignment.module.css";
import RdfSidebar from "../../components/SemanticAlignment/RdfSidebar/rdfSidebar";
import ElementDetailPanel from "../../components/SemanticAlignment/ElementDetailPanel/elementDetailPanel";
import RdfConnection from "../../components/SemanticAlignment/RdfCard/rdfConnection";
import RdfCard from "../../components/SemanticAlignment/RdfCard/rdfCard";
import UploadFilePicker from "../../components/Common/FilePicker/uploadFilePicker";
import { generateDistinctColors } from "../../util/colors";
import { uploadSemanticMappingCsv } from "../../util/petitionHandler";
import { toast, ToastContainer } from "react-toastify";

function SemanticAlignment() {
  const location = useLocation();
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

    // 1) Build the union of every field name across all built cards:
    const dynamicFields = Array.from(new Set(cards.flatMap((card) => card.fields)));

    // 2) Assemble the full header in the desired order:
    const header = [
      "field_id",
      "pattern_type",
      ...dynamicFields,
      "value_type",
      "categorical_value",
      "categorical_ontology_mapping"
    ];

    // 3) Build each row (exploding categoricals)
    const rows = [];
    cards.forEach((card) => {
      const base = {
        field_id: card.elementName,
        pattern_type: card.optionLabel,
        // fill in all dynamic fields (empty if unused)
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
        // non‑categorical: one row, blank C‑columns
        rows.push({
          ...base,
          categorical_value: "",
          categorical_ontology_mapping: ""
        });
      }
    });

    // 4) Serialize & download
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

    // 2) RDF feedback
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
    // On mobile, automatically switch to detail tab
    if (isMobile) {
      setMobileView("detail");
    }
  };
  // before you had logic to return category if activeCategoryIndex != null.
  // replace it with:
  const getActiveItem = () => {
    if (!elements || activeElementIndex == null) return null;
    return { ...elements.elements[activeElementIndex], isCategory: false };
  };

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
  const activeItem = getActiveItem();

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

  // --- Drag logic ---
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

  // Resizer logic (desktop only)
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

  // Toggle the mobileView
  const toggleMobileView = () => {
    setMobileView((prev) => (prev === "detail" ? "workspace" : "detail"));
  };

  // ---- Desktop Layout ----
  const renderDesktopLayout = () => {
    return (
      <CSSTransition
        in={!!elements}
        timeout={300}
        classNames={{
          enter: SemanticAlignmentStyles.fadeEnter,
          enterActive: SemanticAlignmentStyles.fadeEnterActive,
          exit: SemanticAlignmentStyles.fadeExit,
          exitActive: SemanticAlignmentStyles.fadeExitActive,
        }}
        unmountOnExit
      >
        <div className={SemanticAlignmentStyles.mainContent} ref={workspaceRef}>
          {/* LEFT PANEL: RdfSidebar */}
          <div className={SemanticAlignmentStyles.leftPanel}>
            {elements && (
              <RdfSidebar
                elements={elements}
                activeElementIndex={activeElementIndex}
                activeCategoryIndex={activeCategoryIndex}
                onSelectElement={handleSelectElement}
                builtClasses={builtClasses}
              />
            )}
          </div>

          {/* MIDDLE PANEL: ElementDetailPanel */}
          <div
            className={SemanticAlignmentStyles.middlePanel}
            style={{ width: `${middlePanelWidth}vw` }}
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
              onSelectOption={(option) => {
                if (activeElementIndex === null) return;
                const key =
                  activeCategoryIndex != null
                    ? `${activeElementIndex}-cat-${activeCategoryIndex}`
                    : `${activeElementIndex}`;
                setElementSelections((prev) => ({
                  ...prev,
                  [key]: option,
                }));
              }}
              activeElementIndex={activeElementIndex}
              activeCategoryIndex={activeCategoryIndex}
              elementFormValues={elementFormValues}
              setElementFormValues={setElementFormValues}
              onBuildClass={(formFields) => handleBuildClass(formFields)}
              onDeleteClass={handleDeleteByBuiltKey}
              builtClasses={builtClasses}
            />
          </div>

          {/* RESIZER */}
          <div
            className={SemanticAlignmentStyles.resizer}
            onMouseDown={handleResizerMouseDown}
            onTouchStart={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />

          {/* RIGHT PANEL: Workspace */}
          <div
            className={SemanticAlignmentStyles.rightPanel}
            style={{
              width: `${100 - 20 - middlePanelWidth}vw`,
            }}
            onWheel={handleWheel}
          >
            <div
              className={SemanticAlignmentStyles.workspaceContent}
              style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
            >
              {isConnecting && (
                <div className={SemanticAlignmentStyles.connectionMessage}>
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
                  onMouseDown={(e) => handleMouseDownCard(e, card.id)}
                  onTouchStart={(e) => handleTouchStartCard(e, card.id)}
                  onCardClick={() => handleCardClick(card.id)}
                  onRemoveCard={() => handleRemoveCard(card.id)}
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
            <div className={SemanticAlignmentStyles.controls}>
              <div className={SemanticAlignmentStyles.controlsBottom}>
                <button
                  onClick={() => {
                    setIsConnecting(true);
                    setTempFromCard(null);
                  }}
                  className={SemanticAlignmentStyles.controlBtn}
                >
                  Create Connection
                </button>
                <button
                  onClick={handleRemoveConnection}
                  className={SemanticAlignmentStyles.controlBtn}
                >
                  Remove Last
                </button>
                <button
                  onClick={handleResetZoom}
                  className={SemanticAlignmentStyles.controlBtn}
                >
                  Reset Zoom
                </button>
                <button
                  onClick={handleFileClick}
                  className={SemanticAlignmentStyles.controlBtn}
                >
                  Upload CSV
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className={SemanticAlignmentStyles.controlBtn}
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
          modalTitle="Upload mapped elements"
        />
      );
    }

    return (
      <div className={SemanticAlignmentStyles.mobileLayout}>
        {/* TOP 30%: RdfSidebar */}
        <div className={SemanticAlignmentStyles.mobileSidebar}>
          <RdfSidebar
            elements={elements}
            activeElementIndex={activeElementIndex}
            activeCategoryIndex={activeCategoryIndex}
            onSelectElement={handleSelectElement}
            builtClasses={builtClasses}
          />

          {/* SINGLE TOGGLE BUTTON HOVERING OVER THE SIDEBAR */}
          <button
            className={SemanticAlignmentStyles.mobileToggleBtn}
            onClick={toggleMobileView}
          >
            {mobileView === "detail" ? "Workspace" : "Details"}
          </button>
        </div>

        {/* BOTTOM 70%: show either the detail panel or the workspace */}
        <div className={SemanticAlignmentStyles.mobileContent}>
          {mobileView === "detail" && (
            <div className={SemanticAlignmentStyles.mobileDetailWrapper}>
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
                onSelectOption={(option) => {
                  if (activeElementIndex === null) return;
                  const key =
                    activeCategoryIndex != null
                      ? `${activeElementIndex}-cat-${activeCategoryIndex}`
                      : `${activeElementIndex}`;
                  setElementSelections((prev) => ({
                    ...prev,
                    [key]: option,
                  }));
                }}
                activeElementIndex={activeElementIndex}
                activeCategoryIndex={activeCategoryIndex}
                elementFormValues={elementFormValues}
                setElementFormValues={setElementFormValues}
                onBuildClass={(formFields) => handleBuildClass(formFields)}
                onDeleteClass={handleDeleteByBuiltKey}
                builtClasses={builtClasses}
              />
            </div>
          )}
          {mobileView === "workspace" && (
            <div className={SemanticAlignmentStyles.mobileWorkspace}>
              {isConnecting && (
                <div className={SemanticAlignmentStyles.connectionMessage}>
                  {tempFromCard
                    ? "Select target card to complete connection"
                    : "Select source card to start connection"}
                </div>
              )}
              <div
                className={SemanticAlignmentStyles.workspaceContent}
                style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
                onWheel={handleWheel}
              >
                <RdfConnection connections={connections} cards={cards} zoom={zoom} />
                {cards.map((card) => (
                  <RdfCard
                    key={card.id}
                    card={card}
                    onMouseDown={(e) => handleMouseDownCard(e, card.id)}
                    onTouchStart={(e) => handleTouchStartCard(e, card.id)}
                    onCardClick={() => handleCardClick(card.id)}
                    onRemoveCard={() => handleRemoveCard(card.id)}
                  />
                ))}
              </div>

              {/* Controls at bottom in workspace view */}
              <div className={SemanticAlignmentStyles.controls}>
                <div className={SemanticAlignmentStyles.controlsBottom}>
                  <button
                    onClick={() => {
                      setIsConnecting(true);
                      setTempFromCard(null);
                    }}
                    className={SemanticAlignmentStyles.controlBtn}
                  >
                    Create Connection
                  </button>
                  <button
                    onClick={handleRemoveConnection}
                    className={SemanticAlignmentStyles.controlBtn}
                  >
                    Remove Last
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className={SemanticAlignmentStyles.controlBtn}
                  >
                    Reset Zoom
                  </button>
                  <button
                    onClick={handleFileClick}
                    className={SemanticAlignmentStyles.controlBtn}
                  >
                    Upload CSV
                  </button>
                  <button
                    onClick={handleProcess}
                    className={SemanticAlignmentStyles.controlBtn}
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
    <div className={SemanticAlignmentStyles.container}>
      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        className={SemanticAlignmentStyles.toastContainer}
        toastClassName={SemanticAlignmentStyles.toast}
      />
      {!elements && (
        <UploadFilePicker
          onFileUpload={handleFileUpload}
          isProcessing={false}
          modalTitle={"Upload mapped elements"}
        />
      )}
      {elements && (isMobile ? renderMobileLayout() : renderDesktopLayout())}
    </div>
  );
}

export default SemanticAlignment;
