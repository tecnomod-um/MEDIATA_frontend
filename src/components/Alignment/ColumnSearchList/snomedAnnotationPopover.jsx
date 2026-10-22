import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import { fetchSuggestions } from "../../../util/petitionHandler";
import { parseTerminology } from "./columnMappingStatus";
import styles from "./snomedAnnotationPopover.module.css";

const SEARCH_DEBOUNCE_MS = 150;
const isMobileViewport = () =>
  window.matchMedia?.("(max-width: 768px)").matches ?? window.innerWidth <= 768;

const resultCode = (result) => {
  const iri = String(result?.iri || "");
  return iri.split(/[\/#]/).filter(Boolean).pop() || "";
};

function SnomedAnnotationPopover({
  anchorElement,
  column,
  onChange,
  onClose,
  searchSnomed = fetchSuggestions,
}) {
  const panelRef = useRef(null);
  const requestRef = useRef(0);
  const hasSearchedRef = useRef(false);
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState(
    String(column?.column || "").replace(/[_-]+/g, " ").trim()
  );
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");

  const currentTerm = parseTerminology(column?.terminology);
  useEffect(() => {
    if (!isMobileViewport()) {
      searchInputRef.current?.focus({ preventScroll: true });
    }
  }, []);
  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!anchorElement || !panel) return;

    let disposed = false;
    let closing = false;
    let positionRequest = 0;

    const scrollRoot = anchorElement.closest(
      "[data-snomed-scroll-root]"
    );

    const updatePosition = () => {
      if (disposed || closing) return;
      if (!anchorElement.isConnected) {
        closing = true;
        onClose();
        return;
      }

      const anchorRect = anchorElement.getBoundingClientRect();
      const scrollRect = scrollRoot?.getBoundingClientRect();

      const visibleTop = Math.max(0, scrollRect?.top ?? 0);
      const visibleBottom = Math.min(
        window.innerHeight,
        scrollRect?.bottom ?? window.innerHeight
      );
      const visibleLeft = Math.max(0, scrollRect?.left ?? 0);
      const visibleRight = Math.min(
        window.innerWidth,
        scrollRect?.right ?? window.innerWidth
      );

      const anchorIsVisible =
        anchorRect.bottom > visibleTop &&
        anchorRect.top < visibleBottom &&
        anchorRect.right > visibleLeft &&
        anchorRect.left < visibleRight;
      const scrollRootHasLayout = Boolean(scrollRect?.width || scrollRect?.height);

      if (scrollRootHasLayout && !anchorIsVisible) {
        closing = true;
        panel.style.visibility = "hidden";
        onClose();
        return;
      }

      const request = ++positionRequest;

      // Mobile uses a viewport-fixed bottom sheet.
      if (isMobileViewport()) {
        panel.style.left = "";
        panel.style.top = "";
        panel.style.visibility = "visible";
        return;
      }

      const panelHeight = panel.getBoundingClientRect().height || 430;
      const alignToEnd = anchorRect.top + panelHeight > window.innerHeight - 12;
      const placement = alignToEnd ? "right-end" : "right-start";

      computePosition(anchorElement, panel, {
        strategy: "fixed",
        placement,
        middleware: [
          offset(8),
          flip({
            fallbackPlacements: [alignToEnd ? "left-end" : "left-start"],
            padding: { top: 63, right: 12, bottom: 12, left: 12 },
          }),
          shift({
            padding: { top: 63, right: 12, bottom: 12, left: 12 },
            crossAxis: false,
          }),
        ],
      }).then(({ x, y }) => {
        // Ignore outdated asynchronous calculations.
        if (disposed || closing || request !== positionRequest) {
          return;
        }

        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.visibility = "visible";
      });
    };

    const cleanup = autoUpdate(
      anchorElement,
      panel,
      updatePosition,
      {
        ancestorScroll: true,
        ancestorResize: true,
        elementResize: typeof ResizeObserver !== "undefined",
        layoutShift: typeof IntersectionObserver !== "undefined",
      }
    );

    return () => {
      disposed = true;
      cleanup();
    };
  }, [anchorElement, onClose]);

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

    const delay = hasSearchedRef.current ? SEARCH_DEBOUNCE_MS : 0;
    hasSearchedRef.current = true;
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
    }, delay);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, searchSnomed]);

  const applyTerminology = (terminology) => {
    onChange(terminology);
  };

  return createPortal(
    <section
      ref={panelRef}
      className={styles.popover}
      role="dialog"
      aria-label={`SNOMED CT annotation for ${column?.column}`}
    >
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <span className={styles.eyebrow}>SNOMED CT annotation</span>
          <h3 className={styles.title}>{column?.column}</h3>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close annotation search" title="Close">
          <CloseIcon fontSize="small" />
        </button>
      </header>

      {currentTerm.label && (
        <div className={styles.currentAnnotation}>
          <div className={styles.currentText}>
            <span className={styles.currentLabel}>
              {currentTerm.code ? "Current SNOMED CT concept" : "Current terminology"}
            </span>
            <strong>{currentTerm.label}</strong>
            {currentTerm.code && <span className={styles.code}>{currentTerm.code}</span>}
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => applyTerminology("")}
            aria-label={`Remove SNOMED CT annotation from ${column?.column}`}
            title="Remove annotation"
          >
            <DeleteOutlineIcon fontSize="small" />
          </button>
        </div>
      )}

      <label className={styles.searchField}>
        <SearchIcon className={styles.searchIcon} fontSize="small" aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search SNOMED CT"
          aria-label="Search SNOMED CT concepts"
        />
      </label>

      <div className={styles.results} role="listbox" aria-label="SNOMED CT concepts">
        {status === "loading" && <div className={styles.message}>Searching Snowstorm...</div>}
        {status === "short" && <div className={styles.message}>Enter at least three characters.</div>}
        {status === "empty" && (
          <div className={`${styles.message} ${styles.emptyMessage}`}>
            <span>No matching concepts.</span>
            <button
              type="button"
              className={styles.useInputButton}
              onClick={() => applyTerminology(query.trim())}
              aria-label={`Use "${query.trim()}" as terminology`}
            >
              Use input as terminology
            </button>
          </div>
        )}
        {status === "error" && <div className={`${styles.message} ${styles.error}`}>Snowstorm could not be reached.</div>}
        {results.map((result) => {
          const code = resultCode(result);
          const terminology = code ? `${result.label} | ${code}` : result.label;
          const selected = column?.terminology === terminology;
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
