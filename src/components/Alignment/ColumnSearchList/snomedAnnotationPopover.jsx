import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import { fetchSuggestions } from "../../../util/petitionHandler";
import { parseTerminology } from "./columnMappingStatus";
import styles from "./snomedAnnotationPopover.module.css";

const resultCode = (result) => {
  const iri = String(result?.iri || "");
  return iri.split(/[\/#]/).filter(Boolean).pop() || "";
};

function SnomedAnnotationPopover({
  anchorElement,
  column,
  targets,
  onChange,
  onClose,
  searchSnomed = fetchSuggestions,
}) {
  const panelRef = useRef(null);
  const requestRef = useRef(0);
  const [selectedTargetId, setSelectedTargetId] = useState(targets[0]?.id || "");
  const [query, setQuery] = useState(
    String(column?.column || "").replace(/[_-]+/g, " ").trim()
  );
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [position, setPosition] = useState({ left: 12, top: 72, width: 380 });

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) || targets[0],
    [selectedTargetId, targets]
  );
  const currentTerm = parseTerminology(selectedTarget?.terminology);

  useEffect(() => {
    if (!targets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId(targets[0]?.id || "");
    }
  }, [selectedTargetId, targets]);

  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorElement?.getBoundingClientRect?.();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(380, viewportWidth - 24);
      const estimatedHeight = 430;

      if (viewportWidth <= 768 || !rect) {
        setPosition({ left: 12, top: Math.max(12, viewportHeight - estimatedHeight - 66), width });
        return;
      }

      const spaceToRight = viewportWidth - rect.right - 12;
      const spaceToLeft = rect.left - 12;
      const left = spaceToRight >= width + 8
        ? rect.right + 8
        : spaceToLeft >= width + 8
          ? rect.left - width - 8
          : Math.min(Math.max(12, rect.right - width), viewportWidth - width - 12);
      const below = rect.bottom + 8;
      const top = below + estimatedHeight <= viewportHeight
        ? below
        : Math.max(12, rect.top - estimatedHeight - 8);
      setPosition({ left, top, width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorElement]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || anchorElement?.contains(event.target)) return;
      onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorElement, onClose]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setResults([]);
      setStatus(normalizedQuery ? "short" : "idle");
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus("loading");
    let active = true;

    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await searchSnomed(normalizedQuery, "snomed");
        if (!active || requestRef.current !== requestId) return;
        setResults((suggestions || []).slice(0, 8));
        setStatus((suggestions || []).length ? "ready" : "empty");
      } catch {
        if (!active || requestRef.current !== requestId) return;
        setResults([]);
        setStatus("error");
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, searchSnomed]);

  const applyTerminology = (terminology) => {
    if (!selectedTarget) return;
    onChange(selectedTarget.mappingIndex, selectedTarget.mappingKey, terminology);
  };

  return createPortal(
    <section
      ref={panelRef}
      className={styles.popover}
      style={position}
      role="dialog"
      aria-label={`SNOMED CT annotation for ${column?.column}`}
    >
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <span className={styles.eyebrow}>SNOMED CT annotation</span>
          <h3 className={styles.title}>{column?.column}</h3>
        </div>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close annotation search">
          <CloseIcon fontSize="small" />
        </button>
      </header>

      {targets.length > 1 && (
        <label className={styles.targetField}>
          <span>Mapping target</span>
          <select value={selectedTarget?.id || ""} onChange={(event) => setSelectedTargetId(event.target.value)}>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label} ({target.kind})
              </option>
            ))}
          </select>
        </label>
      )}

      {currentTerm.label && (
        <div className={styles.currentAnnotation}>
          <div className={styles.currentText}>
            <span className={styles.currentLabel}>Current annotation</span>
            <strong>{currentTerm.label}</strong>
            {currentTerm.code && <span className={styles.code}>{currentTerm.code}</span>}
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => applyTerminology("")}
            aria-label={`Remove SNOMED CT annotation from ${selectedTarget?.label}`}
            title="Remove annotation"
          >
            <DeleteOutlineIcon fontSize="small" />
          </button>
        </div>
      )}

      <label className={styles.searchField}>
        <SearchIcon className={styles.searchIcon} fontSize="small" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search SNOMED CT"
          aria-label="Search SNOMED CT concepts"
          autoFocus
        />
      </label>

      <div className={styles.results} role="listbox" aria-label="SNOMED CT concepts">
        {status === "loading" && <div className={styles.message}>Searching Snowstorm...</div>}
        {status === "short" && <div className={styles.message}>Enter at least three characters.</div>}
        {status === "empty" && <div className={styles.message}>No matching concepts.</div>}
        {status === "error" && <div className={`${styles.message} ${styles.error}`}>Snowstorm could not be reached.</div>}
        {results.map((result) => {
          const code = resultCode(result);
          const terminology = code ? `${result.label} | ${code}` : result.label;
          const selected = selectedTarget?.terminology === terminology;
          return (
            <button
              type="button"
              role="option"
              aria-selected={selected}
              key={result.iri || terminology}
              className={`${styles.result}${selected ? ` ${styles.resultSelected}` : ""}`}
              onClick={() => applyTerminology(terminology)}
            >
              <span className={styles.resultLabel}>{result.label}</span>
              {code && <span className={styles.code}>{code}</span>}
            </button>
          );
        })}
      </div>
    </section>,
    document.body
  );
}

export default SnomedAnnotationPopover;
