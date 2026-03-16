import React, { useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import descriptionModalStyles from "../DescriptionModal/descriptionModal.module.css";
import Styles from "./suggestMappingsModal.module.css";

function SuggestMappingsModal({ isOpen, onClose, onReplace, onAppend, hasExistingMappings }) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={onClose} modalClassName={descriptionModalStyles.overlayModal}>
      <div className={Styles.suggestModal}>
        <header className={descriptionModalStyles.modalHeader}>
          <h3 className={descriptionModalStyles.title}>Apply suggested mappings</h3>

          <div className={descriptionModalStyles.headerRight}>
            <IconButton
              className={descriptionModalStyles.iconBtn}
              onClick={onClose}
              aria-label="Close"
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </header>

        <section className={descriptionModalStyles.modalContent}>
          <p className={Styles.text}>
            {hasExistingMappings
              ? "You already have a mapping hierarchy. How should the suggested mappings be applied?"
              : "No existing mappings found. Choose how to apply suggestions."}
          </p>
        </section>
        <footer className={Styles.footer}>
          <button
            type="button"
            className={Styles.replaceBtn}
            onClick={onReplace}
            disabled={!hasExistingMappings}
            title={hasExistingMappings ? "Replace existing hierarchy" : "No existing hierarchy to replace"}
          >
            Replace
          </button>
          <button type="button" className={Styles.appendBtn} onClick={onAppend}>
            Append
          </button>
        </footer>
      </div>
    </OverlayWrapper>
  );
}

export default SuggestMappingsModal;
