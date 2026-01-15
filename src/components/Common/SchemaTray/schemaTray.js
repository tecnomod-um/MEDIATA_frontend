import React, { useState, useRef, useEffect, useCallback } from "react";
import SchemaTrayStyles from "./schemaTray.module.css";
import { IoMdClose } from "react-icons/io";
import { saveSchemaToBackend, fetchSchemaFromBackend, removeSchemaFromBackend } from "../../../util/petitionHandler";

// Uploads and manages a JSON schema for suggestions to the current project
const SchemaTray = ({ error, setError, nodesFetched, externalSchema = null, onRemoveExternalSchema = null, onSchemaChange, reduced = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [schema, setSchema] = useState(externalSchema);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Editor states
  const [draftText, setDraftText] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const trayRef = useRef(null);

  // Sync with externalSchema if provided
  useEffect(() => {
    if (externalSchema) setSchema(externalSchema);
  }, [externalSchema]);

  const getFormattedSchema = useCallback(() => {
    if (!schema) return "";
    try {
      const schemaObj = typeof schema === "string" ? JSON.parse(schema) : schema;
      return JSON.stringify(schemaObj, null, 2);
    } catch {
      return typeof schema === "string" ? schema : String(schema);
    }
  }, [schema]);

  useEffect(() => {
    if (isExpanded && schema) {
      setDraftText(getFormattedSchema());
      setIsDirty(false);
    }
  }, [isExpanded, schema, getFormattedSchema]);

  useEffect(() => {
    if (externalSchema) return;
    if (!nodesFetched) return;

    const timer = setTimeout(() => {
      (async () => {
        try {
          const data = await fetchSchemaFromBackend();
          if (data && data.schema) setSchema(data.schema);
        } catch (err) {
          console.error("Failed fetching schema from backend:", err);
          setError("Failed fetching schema from backend");
        }
      })();
    }, 750);

    return () => clearTimeout(timer);
  }, [nodesFetched, externalSchema, setError]);

  const commitDraft = useCallback(async () => {
    if (!isExpanded) return true;
    if (!schema) return true;
    if (!isDirty) return true;

    try {
      const parsed = JSON.parse(draftText);

      setIsSaving(true);
      setError("");

      setSchema(parsed);
      if (onSchemaChange) onSchemaChange(parsed);

      await saveSchemaToBackend(parsed);

      setIsDirty(false);
      return true;
    } catch (e) {
      setError("Invalid JSON. Fix formatting before closing/saving.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draftText, isDirty, isExpanded, schema, onSchemaChange, setError]);

  useEffect(() => {
    async function handleClickOutside(e) {
      if (!trayRef.current || trayRef.current.contains(e.target)) return;
      if (!isOpen) return;

      const ok = await commitDraft();
      // If JSON invalid, keep tray open so user can fix it
      if (!ok) return;

      setIsOpen(false);
      setIsExpanded(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, commitDraft]);

  useEffect(() => {
    async function onKeyDown(e) {
      const isSaveCombo =
        (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");

      if (!isSaveCombo) return;
      if (!isOpen || !isExpanded || !schema) return;

      e.preventDefault();
      await commitDraft();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isExpanded, schema, commitDraft]);

  const toggleTray = async () => {
    if (isOpen) {
      const ok = await commitDraft();
      if (!ok) return;
      setIsExpanded(false);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
  };

  const toggleExpand = async () => {
    if (isExpanded) {
      const ok = await commitDraft();
      if (!ok) return;
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setSchema(json);
        if (onSchemaChange) onSchemaChange(json);
        setError("");
        await saveSchemaToBackend(json);
      } catch {
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
      if (onSchemaChange) onSchemaChange(json);

      await saveSchemaToBackend(json);
    } catch (err) {
      setError(err.message);
      setSchema(null);
      if (onSchemaChange) onSchemaChange(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSchema = async () => {
    setIsExpanded(false);
    setSchema(null);
    setDraftText("");
    setIsDirty(false);

    if (onSchemaChange) onSchemaChange(null);

    try {
      await removeSchemaFromBackend();
      if (onRemoveExternalSchema) onRemoveExternalSchema();
    } catch (err) {
      console.error("Failed to remove schema from backend:", err);
      setError("Failed to remove schema from server.");
    }
  };

  const formattedSchema = getFormattedSchema();

  return (
    <div className={SchemaTrayStyles.schemaTrayWrapper}>
      <div
        ref={trayRef}
        className={`${SchemaTrayStyles.tray} ${isOpen ? SchemaTrayStyles.open : SchemaTrayStyles.closed
          } ${isExpanded ? SchemaTrayStyles.expanded : ""}`}
      >
        <div className={SchemaTrayStyles.trayHeader}>
          <h3>JSON Schema</h3>
          <div className={SchemaTrayStyles.headerButtons}>
            {schema && (
              <button
                className={SchemaTrayStyles.expandButton}
                onClick={toggleExpand}
                disabled={isSaving}
                title={isExpanded ? "Contract (saves)" : "Expand (editable)"}
              >
                {isExpanded ? "Contract" : "Expand"}
              </button>
            )}
            <button
              className={SchemaTrayStyles.toggleButton}
              type="button"
              aria-label="Close"
              onClick={toggleTray}
              disabled={isSaving}
            >
              <IoMdClose size={18} />
            </button>
          </div>
        </div>

        <div className={SchemaTrayStyles.trayContent}>
          {schema ? (
            <div className={SchemaTrayStyles.schemaDisplayContainer}>
              <div className={SchemaTrayStyles.schemaScrollArea}>
                {!isExpanded ? (
                  <pre className={SchemaTrayStyles.schemaDisplay}>
                    {formattedSchema}
                  </pre>
                ) : (
                  <textarea
                    className={SchemaTrayStyles.schemaEditor}
                    value={draftText}
                    onChange={(e) => {
                      setDraftText(e.target.value);
                      setIsDirty(true);
                      if (error) setError("");
                    }}
                    spellCheck={false}
                  />
                )}
              </div>

              <div className={SchemaTrayStyles.schemaFooter}>
                <div className={SchemaTrayStyles.schemaStatus}>
                  {isSaving
                    ? "Saving..."
                    : isExpanded && isDirty
                      ? "Unsaved changes"
                      : ""}
                </div>

                <button
                  className={SchemaTrayStyles.removeButton}
                  onClick={handleRemoveSchema}
                  disabled={isSaving}
                >
                  Remove Schema
                </button>
              </div>

              {schema && error && (
                <div
                  className={`${SchemaTrayStyles.errorMessage} ${SchemaTrayStyles.fadeIn}`}
                >
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className={SchemaTrayStyles.noSchema}>
              <p className={SchemaTrayStyles.noSchemaText}>
                No schema has been set
              </p>

              <div className={SchemaTrayStyles.controlContainer}>
                <div className={SchemaTrayStyles.uploadRow}>
                  <label
                    htmlFor="fileUpload"
                    className={SchemaTrayStyles.uploadLabel}
                  >
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
                <div
                  className={`${SchemaTrayStyles.errorMessage} ${SchemaTrayStyles.fadeIn}`}
                >
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
}

export default SchemaTray;
