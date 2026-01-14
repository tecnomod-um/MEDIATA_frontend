import React, { useState, useRef, useEffect } from "react";
import SchemaTrayStyles from "./schemaTray.module.css";
import { saveSchemaToBackend, fetchSchemaFromBackend, removeSchemaFromBackend } from "../../../util/petitionHandler";

const SchemaTray = ({ error, setError, nodesFetched, externalSchema = null, onRemoveExternalSchema = null, onSchemaChange, reduced = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [schema, setSchema] = useState(externalSchema);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const trayRef = useRef(null);

  // Sync with externalSchema if provided
  useEffect(() => {
    if (externalSchema) setSchema(externalSchema);
  }, [externalSchema]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (trayRef.current && !trayRef.current.contains(e.target))
        if (isOpen) {
          setIsOpen(false);
          setIsExpanded(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (externalSchema) return;
    if (!nodesFetched) return;
    const timer = setTimeout(() => {
      (async () => {
        try {
          const data = await fetchSchemaFromBackend();
          if (data && data.schema) setSchema(data.schema);
        } catch (err) {
          if (
            err.response &&
            err.response.data &&
            err.response.data.error &&
            err.response.data.error !== "No schema found"
          ) {
            console.error("Failed fetching schema from backend:", err);
            setError("Failed fetching schema from backend");
          } else {
            console.error("Failed fetching schema from backend:", err);
            setError("Failed fetching schema from backend");
          }
        }
      })();
    }, 750);
    return () => clearTimeout(timer);
  }, [nodesFetched, externalSchema, setError]);

  const toggleTray = () => {
    setIsOpen((prev) => {
      if (prev) setIsExpanded(false);
      return !prev;
    });
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setSchema(json);
        if (onSchemaChange)
          onSchemaChange(json);
        setError("");
        await saveSchemaToBackend(json);
      } catch (err) {
        setError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleFetchSchema = async () => {
    if (!urlInput) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(urlInput);
      if (!response.ok) throw new Error("Failed to fetch schema.");
      const json = await response.json();
      setSchema(json);
      if (onSchemaChange) {
        onSchemaChange(json);
      }
      await saveSchemaToBackend(json);
    } catch (err) {
      setError(err.message);
      setSchema(null);
      if (onSchemaChange)
        onSchemaChange(null);

    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSchema = async () => {
    setIsExpanded(false);
    setSchema(null);
    if (onSchemaChange)
      onSchemaChange(null);

    try {
      await removeSchemaFromBackend();
      if (onRemoveExternalSchema)
        onRemoveExternalSchema();
    } catch (err) {
      console.error("Failed to remove schema from backend:", err);
      setError("Failed to remove schema from server.");
    }
  };

  let formattedSchema = "";
  if (schema) {
    try {
      const schemaObj = typeof schema === "string" ? JSON.parse(schema) : schema;
      formattedSchema = JSON.stringify(schemaObj, null, 2);
    } catch (err) {
      formattedSchema = schema;
    }
  }

  return (
    <div className={SchemaTrayStyles.schemaTrayWrapper}>
      <div
        ref={trayRef}
        className={`${SchemaTrayStyles.tray} ${isOpen ? SchemaTrayStyles.open : SchemaTrayStyles.closed} ${isExpanded ? SchemaTrayStyles.expanded : ""
          }`}
      >
        <div className={SchemaTrayStyles.trayHeader}>
          <h3>JSON Schema</h3>
          <div className={SchemaTrayStyles.headerButtons}>
            {schema && (
              <button className={SchemaTrayStyles.expandButton} onClick={toggleExpand}>
                {isExpanded ? "Contract" : "Expand"}
              </button>
            )}
            <button className={SchemaTrayStyles.toggleButton} onClick={toggleTray}>
              ✖
            </button>
          </div>
        </div>
        <div className={SchemaTrayStyles.trayContent}>
          {schema ? (
            <div className={SchemaTrayStyles.schemaDisplayContainer}>
              <div className={SchemaTrayStyles.schemaScrollArea}>
                <pre className={SchemaTrayStyles.schemaDisplay}>{formattedSchema}</pre>
              </div>
              <div className={SchemaTrayStyles.schemaFooter}>
                <button
                  className={SchemaTrayStyles.removeButton}
                  onClick={handleRemoveSchema}
                >
                  Remove Schema
                </button>
              </div>
            </div>
          ) : (
            <div className={SchemaTrayStyles.noSchema}>
              <p className={SchemaTrayStyles.noSchemaText}>No schema has been set</p>
              <div className={SchemaTrayStyles.controlContainer}>
                <div className={SchemaTrayStyles.uploadRow}>
                  <label htmlFor="fileUpload" className={SchemaTrayStyles.uploadLabel}>
                    Upload JSON File
                  </label>
                  <input
                    id="fileUpload"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className={SchemaTrayStyles.uploadInput}
                  />
                </div>
                <div className={SchemaTrayStyles.orRow}>
                  <span>or</span>
                </div>
                <div className={SchemaTrayStyles.urlRow}>
                  <input
                    type="text"
                    placeholder="Enter schema URL"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className={SchemaTrayStyles.urlInput}
                  />
                  <button
                    onClick={handleFetchSchema}
                    className={SchemaTrayStyles.fetchButton}
                    disabled={loading}
                  >
                    {loading ? "Fetching..." : "Fetch"}
                  </button>
                </div>
              </div>
              {!schema && error && (
                <div className={`${SchemaTrayStyles.errorMessage} ${SchemaTrayStyles.fadeIn}`}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {!isOpen && (
        <div
          className={SchemaTrayStyles.closedTab}
          style={reduced ? { width: "30px" } : {}}
          onClick={toggleTray}
        >
          <span>Schema</span>
        </div>
      )}
    </div>
  );
};

export default SchemaTray;
