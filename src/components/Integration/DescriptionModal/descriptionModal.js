import React, { useEffect, useMemo } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import Styles from "./descriptionModal.module.css";

const ordinalWord = (n) => {
  const map = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  return map[n - 1] || `${n}th`;
};

const buildPlaceholder = ({ kind, label, index }) => {
  const trimmed = (label || "").trim();

  if (trimmed) return `Describe ${trimmed}`;

  if (kind === "union") return "Describe the column";
  // kind === "value"
  return `Describe the ${ordinalWord((index ?? 0) + 1)} value`;
};

function DescriptionModal({
  isOpen,
  closeModal,
  items = [],
  activeIndex = 0,
  value = "",
  onChange,
  onPrev,
  onNext,
}) {
  const activeItem = items[activeIndex];

  const placeholder = useMemo(() => {
    if (!activeItem) return "Describe";
    return buildPlaceholder(activeItem);
  }, [activeItem]);

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < items.length - 1;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft" && canPrev) onPrev();
      if (e.key === "ArrowRight" && canNext) onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeModal, canPrev, canNext, onPrev, onNext]);

  return (
    <OverlayWrapper
      isOpen={isOpen}
      closeModal={closeModal}
      modalClassName={Styles.overlayModal}
    >
      <div className={Styles.descriptionModal}>
        <header className={Styles.modalHeader}>
          <h3 className={Styles.title}>
            <DescriptionOutlinedIcon className={Styles.titleIcon} />
            Description
          </h3>
          <div className={Styles.headerRight}>
            <span className={Styles.counter}>
              {items.length ? `${activeIndex + 1} / ${items.length}` : "0 / 0"}
            </span>
            <IconButton
              className={Styles.iconBtn}
              onClick={closeModal}
              aria-label="Close"
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </header>
        <section className={Styles.modalContent}>
          <div className={Styles.navRow}>
            <IconButton
              className={`${Styles.iconBtn} ${Styles.navIconBtn}`}
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Previous"
              size="small"
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <div className={Styles.context}>
              {activeItem?.kind === "union" ? (
                <div className={Styles.contextLine}>
                  <span className={Styles.contextKey}>Column:</span>{" "}
                  <span className={Styles.contextVal}>
                    {(activeItem.label || "").trim() || "(unnamed)"}
                  </span>
                </div>
              ) : (
                <div className={Styles.contextLine}>
                  <span className={Styles.contextKey}>Value:</span>{" "}
                  <span className={Styles.contextVal}>
                    {(activeItem?.label || "").trim() || `(value #${activeIndex})`}
                  </span>
                </div>
              )}
            </div>
            <IconButton
              className={`${Styles.iconBtn} ${Styles.navIconBtn}`}
              onClick={onNext}
              disabled={!canNext}
              aria-label="Next"
              size="small"
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </div>

          <textarea
            className={Styles.textarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </section>

        <footer className={Styles.modalFooter}>
          <button
            type="button"
            className={Styles.doneButton}
            onClick={closeModal}
          >
            Done
          </button>
        </footer>
      </div>
    </OverlayWrapper>
  );
}

export default DescriptionModal;
