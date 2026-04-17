import React, { useEffect, useMemo, useState } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import UploadedMappingsResolutionModalStyles from "./uploadedMappingsResolutionModal.module.css";

function UploadedMappingsResolutionModal({ isOpen, closeModal, missingRefs = [], onConfirm, onCheckCompatibility }) {
  const [choices, setChoices] = useState({});
  const [compatibilityBySource, setCompatibilityBySource] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    const initial = {};
    missingRefs.forEach((ref) => {
      const firstNode = ref.candidateNodes?.[0];
      const firstFile = firstNode?.files?.[0] || "";
      initial[ref.sourceId] = {
        nodeId: firstNode?.nodeId || "",
        fileName: firstFile,
      };
    });

    setChoices(initial);
    setCompatibilityBySource({});
  }, [isOpen, missingRefs]);

  const rows = useMemo(() => {
    return missingRefs.map((ref) => {
      const selected = choices[ref.sourceId] || { nodeId: "", fileName: "" };
      const selectedNode = (ref.candidateNodes || []).find(
        (n) => String(n.nodeId) === String(selected.nodeId)
      );

      return {
        ...ref,
        selectedNodeId: selected.nodeId || "",
        selectedFileName: selected.fileName || "",
        availableFiles: selectedNode?.files || [],
      };
    });
  }, [missingRefs, choices]);

  useEffect(() => {
    if (!isOpen || !onCheckCompatibility) return;

    let cancelled = false;

    (async () => {
      for (const row of rows) {
        if (!row.selectedNodeId || !row.selectedFileName) continue;

        try {
          const result = await onCheckCompatibility(
            row.sourceId,
            row.selectedNodeId,
            row.selectedFileName
          );

          if (!cancelled) {
            setCompatibilityBySource((prev) => ({
              ...prev,
              [row.sourceId]: result,
            }));
          }
        } catch (error) {
          if (!cancelled) {
            setCompatibilityBySource((prev) => ({
              ...prev,
              [row.sourceId]: {
                compatible: false,
                requiredColumns: [],
                candidateColumns: [],
                missingColumns: [],
                warning: "Could not verify compatibility.",
              },
            }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, rows, onCheckCompatibility]);

  const isValid = rows.every((row) => row.selectedNodeId && row.selectedFileName);

  const updateChoice = (sourceId, patch) => {
    setChoices((prev) => {
      const current = prev[sourceId] || {};
      const next = { ...current, ...patch };

      if (patch.nodeId != null) {
        const ref = missingRefs.find((x) => x.sourceId === sourceId);
        const node = ref?.candidateNodes?.find(
          (n) => String(n.nodeId) === String(patch.nodeId)
        );
        const nextFiles = node?.files || [];
        next.fileName = nextFiles.includes(current.fileName)
          ? current.fileName
          : (nextFiles[0] || "");
      }

      return { ...prev, [sourceId]: next };
    });
  };

  const handleConfirm = () => {
    if (!isValid) return;

    const resolutionMap = {};
    rows.forEach((row) => {
      resolutionMap[row.sourceId] = {
        sourceId: `${row.selectedNodeId}::${row.selectedFileName}`,
      };
    });

    onConfirm?.(resolutionMap);
  };

  return (
    <OverlayWrapper
      isOpen={isOpen}
      closeModal={closeModal}
      modalClassName={UploadedMappingsResolutionModalStyles.overlayModal}
    >
      <div className={UploadedMappingsResolutionModalStyles.modal}>
        <header className={UploadedMappingsResolutionModalStyles.header}>
          <h3 className={UploadedMappingsResolutionModalStyles.title}>
            <WarningAmberIcon className={UploadedMappingsResolutionModalStyles.titleIcon} />
            Resolve uploaded mappings
          </h3>

          <IconButton onClick={closeModal} size="small" className={UploadedMappingsResolutionModalStyles.iconBtn}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </header>

        <section className={UploadedMappingsResolutionModalStyles.content}>
          <p className={UploadedMappingsResolutionModalStyles.text}>
            Some references from the uploaded mapping spec are not available in the
            current selection. Choose replacements to continue.
          </p>

          <div className={UploadedMappingsResolutionModalStyles.list}>
            {rows.map((row) => {
              const compatibility = compatibilityBySource[row.sourceId];

              return (
                <div key={row.sourceId} className={UploadedMappingsResolutionModalStyles.card}>
                  <div className={UploadedMappingsResolutionModalStyles.sourceBlock}>
                    <div className={UploadedMappingsResolutionModalStyles.label}>Missing reference</div>
                    <div className={UploadedMappingsResolutionModalStyles.value}>
                      {row.displayFileName || row.fileName || "Unknown element file"}
                    </div>
                    {row.displayNodeName ? (
                      <div className={UploadedMappingsResolutionModalStyles.subvalue}>
                        Original node: {row.displayNodeName}
                      </div>
                    ) : null}
                    <div className={UploadedMappingsResolutionModalStyles.reason}>
                      {row.reason === "missing-node"
                        ? "Referenced node is not currently selected."
                        : "Referenced element file was not found in the selected nodes."}
                    </div>
                  </div>

                  <div className={UploadedMappingsResolutionModalStyles.controls}>
                    <select
                      className={UploadedMappingsResolutionModalStyles.select}
                      value={row.selectedNodeId}
                      onChange={(e) =>
                        updateChoice(row.sourceId, { nodeId: e.target.value })
                      }
                    >
                      <option value="">Select node</option>
                      {(row.candidateNodes || []).map((node) => (
                        <option key={node.nodeId} value={node.nodeId}>
                          {node.nodeName}
                        </option>
                      ))}
                    </select>

                    <select
                      className={UploadedMappingsResolutionModalStyles.select}
                      value={row.selectedFileName}
                      onChange={(e) =>
                        updateChoice(row.sourceId, { fileName: e.target.value })
                      }
                      disabled={!row.selectedNodeId}
                    >
                      <option value="">Select element file</option>
                      {(row.availableFiles || []).map((file) => (
                        <option key={file} value={file}>
                          {file}
                        </option>
                      ))}
                    </select>
                  </div>

                  {compatibility && !compatibility.compatible ? (
                    <div className={UploadedMappingsResolutionModalStyles.warningBox}>
                      <div className={UploadedMappingsResolutionModalStyles.warningTitle}>
                        Compatibility warning
                      </div>

                      <div className={UploadedMappingsResolutionModalStyles.warningText}>
                        {compatibility.warning || "Selected file may not match the uploaded mapping."}
                      </div>

                      {compatibility.missingColumns?.length > 0 ? (
                        <div className={UploadedMappingsResolutionModalStyles.warningList}>
                          Missing columns: {compatibility.missingColumns.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  ) : compatibility?.compatible ? (
                    <div className={UploadedMappingsResolutionModalStyles.compatibleOk}>
                      Compatible with uploaded mapping
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <footer className={UploadedMappingsResolutionModalStyles.footer}>
          <button type="button" className={UploadedMappingsResolutionModalStyles.secondaryBtn} onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className={UploadedMappingsResolutionModalStyles.primaryBtn}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Continue
          </button>
        </footer>
      </div>
    </OverlayWrapper>
  );
}

export default UploadedMappingsResolutionModal;