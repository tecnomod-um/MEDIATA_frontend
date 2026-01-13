import React, { useEffect, useRef, useState } from "react";
import { CSSTransition } from "react-transition-group";
import ProjectPickerStyles from "./filePicker.module.css";

const initialsFromName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "P";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
};

const badgeClassFor = (status, styles) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return styles.badgeActive;
    case "in hiatus":
      return styles.badgeHiatus;
    case "closed":
      return styles.badgeClosed;
    default:
      return styles.badgeDefault;
  }
};

function ProjectPicker({ projects = [], onSelectProject, modalTitle }) {
  const [showModal] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const modalRef = useRef(null);
  const listRef = useRef(null);

  const [height, setHeight] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <CSSTransition
      in={showModal}
      timeout={600}
      appear
      nodeRef={modalRef}
      classNames={{
        enter: ProjectPickerStyles.fadeModalEnter,
        enterActive: ProjectPickerStyles.fadeModalEnterActive,
        exit: ProjectPickerStyles.fadeModalExit,
        exitActive: ProjectPickerStyles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div 
        ref={modalRef} 
        className={ProjectPickerStyles.modalBackground}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-picker-title"
      >
        <div className={`${ProjectPickerStyles.modalContainer} ${ProjectPickerStyles.projectModal}`}>
          <h2 
            id="project-picker-title"
            className={ProjectPickerStyles.modalTitle}
          >
            {modalTitle || "Select project"}
          </h2>

          <CSSTransition
            in={loaded}
            nodeRef={listRef}
            timeout={300}
            onEnter={() => {
              if (listRef.current) {
                listRef.current.style.height = "0px";
                const scrollHeight = listRef.current.scrollHeight;
                setTimeout(() => setHeight(scrollHeight), 10);
              }
            }}
            onEntered={() => setHeight("auto")}
            onExit={() => {
              if (listRef.current) {
                const scrollHeight = listRef.current.scrollHeight;
                setHeight(scrollHeight);
                listRef.current.getBoundingClientRect();
              }
            }}
            onExiting={() => setHeight(0)}
            unmountOnExit
            classNames=""
          >
            <div
              ref={listRef}
              className={`${ProjectPickerStyles.fileListWrapperExpanded} ${ProjectPickerStyles.scrollable} ${ProjectPickerStyles.listWrapper}`}
              style={{
                height: height,
                overflow: height === "auto" ? "auto" : "hidden",
                transition: "height 300ms ease",
              }}
            >
              {projects.length === 0 ? (
                <div 
                  className={ProjectPickerStyles.emptyState}
                  role="status"
                  aria-live="polite"
                >
                  No projects available
                </div>
              ) : (
                <ul 
                  role="list"
                  aria-label="Available projects"
                >
                {projects.map((p) => {
                  const showImg = !!p.imageUrl && !brokenImages[p.id];

                  return (
                    <li key={p.id} role="listitem">
                      <button
                        type="button"
                        className={ProjectPickerStyles.projectRow}
                        onClick={() => onSelectProject?.(p)}
                        aria-label={`Select project ${p.name}. ${p.description || ''} Status: ${p.badge || 'Unknown'}`}
                      >
                      <div className={ProjectPickerStyles.thumb}>
                        {showImg ? (
                          <img
                            src={p.imageUrl}
                            alt={`${p.name} logo`}
                            className={ProjectPickerStyles.thumbImg}
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [p.id]: true }))
                            }
                          />
                        ) : (
                          <div className={ProjectPickerStyles.thumbFallback}>
                            {initialsFromName(p.name)}
                          </div>
                        )}
                      </div>

                      <div className={ProjectPickerStyles.projectMain}>
                        <div className={ProjectPickerStyles.projectTopLine}>
                          <span className={ProjectPickerStyles.projectName}>{p.name}</span>
                          {p.badge ? (
                            <span
                              className={`${ProjectPickerStyles.badge} ${badgeClassFor(
                                p.badge,
                                ProjectPickerStyles
                              )}`}
                            >
                              {p.badge}
                            </span>
                          ) : null}
                        </div>

                        {p.description ? (
                          <div className={ProjectPickerStyles.projectDescription}>
                            {p.description}
                          </div>
                        ) : null}
                        <div className={ProjectPickerStyles.projectBottomRow}>
                          <div className={ProjectPickerStyles.statsRow}>
                            <span className={ProjectPickerStyles.statChip}>
                              Users: {Number(p.membersCount) || 0}
                            </span>
                            <span className={ProjectPickerStyles.statChip}>
                              Nodes: {Number(p.nodesCount) || 0}
                            </span>
                            <span className={ProjectPickerStyles.statChip}>
                              DCAT descriptions: {Number(p.dcatCount) || 0}
                            </span>
                          </div>
                          {p.lastAccess ? (
                            <div className={ProjectPickerStyles.lastAccess}>
                              Last accessed: {p.lastAccess}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className={ProjectPickerStyles.chev} aria-hidden="true">
                        ›
                      </div>
                    </button>
                   </li>
                  );
                })}
                </ul>
              )}
            </div>
          </CSSTransition>
        </div>
      </div>
    </CSSTransition>
  );
}

export default ProjectPicker;
