import React, { useEffect, useRef, useState } from "react";
import useScrollFade from "../../../hooks/useScrollFade";
import ImageHighlightsStyles from "./imageHighlights.module.css";

const DEFAULT_HIGHLIGHT_COLOR = "var(--button-color)";
const OVERVIEW_STEP_INDEX = 0;

// Displays a single image and moves a responsive highlight box between authored regions.
function ImageHighlights({
  imageSrc,
  imageAlt,
  steps,
  label = "Highlighted interface walkthrough",
}) {
  const [currentStep, setCurrentStep] = useState(OVERVIEW_STEP_INDEX);
  const containerRef = useRef(null);
  const { ref: fadeRef, style } = useScrollFade();

  const safeSteps = Array.isArray(steps) ? steps : [];
  const activeStep = safeSteps[currentStep] ?? safeSteps[0];
  const activeHighlight = activeStep?.highlight ?? null;
  const highlightSteps = safeSteps.slice(1);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target))
        setCurrentStep(OVERVIEW_STEP_INDEX);
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  const setContainerNode = (node) => {
    containerRef.current = node;
    fadeRef.current = node;
  };

  const goToStep = (index) => {
    const targetStep = index + 1;
    setCurrentStep((stepIndex) => (
      stepIndex === targetStep ? OVERVIEW_STEP_INDEX : targetStep
    ));
  };

  const highlightStyle = activeHighlight ? {
    top: `${activeHighlight.top}%`,
    left: `${activeHighlight.left}%`,
    width: `${activeHighlight.width}%`,
    height: `${activeHighlight.height}%`,
    "--highlight-accent": activeHighlight.color ?? DEFAULT_HIGHLIGHT_COLOR,
  } : null;

  return (
    <div
      ref={setContainerNode}
      className={ImageHighlightsStyles.highlightsContainer}
      style={style}
      data-testid="image-highlights"
      data-steps-count={safeSteps.length}
    >
      <div
        className={ImageHighlightsStyles.imageStage}
        role="region"
        aria-label={label}
        onClick={() => setCurrentStep(OVERVIEW_STEP_INDEX)}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          className={ImageHighlightsStyles.baseImage}
        />

        {highlightStyle && (
          <div
            className={ImageHighlightsStyles.highlightBox}
            style={highlightStyle}
            data-testid="highlight-box"
            aria-hidden="true"
          />
        )}

      </div>

      <div className={ImageHighlightsStyles.stepButtons} role="group" aria-label={`${label} controls`}>
        {highlightSteps.map((step, index) => (
          <button
            key={`${step.title}-${index}`}
            type="button"
            className={`${ImageHighlightsStyles.stepButton} ${currentStep === index + 1 ? ImageHighlightsStyles.activeStepButton : ""}`}
            onClick={() => goToStep(index)}
            aria-pressed={currentStep === index + 1}
            aria-label={`Show ${step.title}`}
          >
            <span className={ImageHighlightsStyles.stepButtonLabel}>{step.title}</span>
          </button>
        ))}
      </div>

      <div className={ImageHighlightsStyles.stepTextContainer}>
        <p className={ImageHighlightsStyles.stepText} role="status" aria-label="Highlight description">
          {activeStep?.description ?? ""}
        </p>
      </div>
    </div>
  );
}

export default React.memo(ImageHighlights);
