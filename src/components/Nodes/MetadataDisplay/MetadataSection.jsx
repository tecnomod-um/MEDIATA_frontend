import React from "react";
import MetadataDisplayStyles from "./metadataDisplay.module.css";

const MetadataSection = ({ title, children, emptyMessage }) => {
  const content = React.Children.toArray(children).filter(Boolean);

  if (content.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <section className={MetadataDisplayStyles.metadataSection}>
      <div className={MetadataDisplayStyles.sectionTitle}>{title}</div>
      {content.length > 0 ? (
        content
      ) : (
        <p className={MetadataDisplayStyles.sectionEmpty}>{emptyMessage}</p>
      )}
    </section>
  );
};

export default MetadataSection;
