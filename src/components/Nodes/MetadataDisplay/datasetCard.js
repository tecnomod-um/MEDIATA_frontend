import React from "react";
import MetadataDisplayStyles from "./metadataDisplay.module.css";

function renderNested(value) {
  if (value === null || value === undefined)
    return <span className={MetadataDisplayStyles.muted}>No value</span>;
  if (Array.isArray(value))
    return value.join(", ");
  if (typeof value === "object")
    return (
      <ul className={MetadataDisplayStyles.objectList}>
        {Object.entries(value).map(([k, v]) => (
          <li key={k}>
            <strong>{k}:</strong> {renderNested(v)}
          </li>
        ))}
      </ul>
    );

  return String(value);
}

function renderField(label, value) {
  return (
    <div className={MetadataDisplayStyles.fieldRow}>
      <div className={MetadataDisplayStyles.fieldLabel}>{label}:</div>
      <div className={MetadataDisplayStyles.fieldValue}>{value}</div>
    </div>
  );
}

// Card displaying dataset metadata information
const DatasetCard = ({ dataset }) => {
  const {
    title,
    description,
    identifier,
    issued,
    modified,
    keyword,
    theme,
    contactPoint,
    distribution,
    publisher,
    accrualPeriodicity,
    spatial,
    temporal,
    language,
  } = dataset;

  const knownFields = [
    "title",
    "description",
    "identifier",
    "issued",
    "modified",
    "keyword",
    "theme",
    "contactPoint",
    "distribution",
    "publisher",
    "accrualPeriodicity",
    "spatial",
    "temporal",
    "language",
  ];

  const extraFields = Object.entries(dataset).filter(
    ([key]) => !knownFields.includes(key)
  );

  function renderDistributions(distributionList) {
    if (!Array.isArray(distributionList) || distributionList.length === 0) {
      return (
        <span className={MetadataDisplayStyles.muted}>
          No distributions provided.
        </span>
      );
    }
    return distributionList.map((dist, i) => {
      const { title: distTitle, description: distDesc, format, license, ...rest } =
        dist;

      return (
        <div key={i} className={MetadataDisplayStyles.distributionCard}>
          <h6>{distTitle || "Untitled Distribution"}</h6>
          {renderField(
            "Description",
            distDesc ?? (
              <span className={MetadataDisplayStyles.muted}>No description provided</span>
            )
          )}
          {format && renderField("Format", format)}
          {license && renderField("License", license)}
          {Object.keys(rest).length > 0 && (
            <div className={MetadataDisplayStyles.extraFields}>
              {Object.entries(rest).map(([k, v]) => (
                <div key={k}>{renderField(k, renderNested(v))}</div>
              ))}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className={MetadataDisplayStyles.datasetCard}>
      <div className={MetadataDisplayStyles.datasetTitle}>
        {title || "Untitled Dataset"}
      </div>

      {renderField(
        "Description",
        description ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{description}</span>
        ) : (
          <span className={MetadataDisplayStyles.muted}>No description provided</span>
        )
      )}
      {identifier && renderField("Identifier", identifier)}
      {issued && renderField("Issued", issued)}
      {modified && renderField("Modified", modified)}
      {keyword && renderField("Keywords", renderNested(keyword))}
      {theme && renderField("Theme", renderNested(theme))}
      {publisher &&
        renderField("Publisher", typeof publisher === "object" ? renderNested(publisher) : publisher)}
      {accrualPeriodicity && renderField("Accrual Periodicity", accrualPeriodicity)}
      {spatial && renderField("Spatial", renderNested(spatial))}
      {temporal && renderField("Temporal", renderNested(temporal))}
      {language && renderField("Language", renderNested(language))}
      {contactPoint &&
        renderField("Contact Point", typeof contactPoint === "object" ? renderNested(contactPoint) : contactPoint)}

      <div className={MetadataDisplayStyles.distSection}>
        <strong>Distributions:</strong> {renderDistributions(distribution)}
      </div>

      {extraFields.length > 0 && (
        <>
          <h6>Additional Fields:</h6>
          <div className={MetadataDisplayStyles.extraFields}>
            {extraFields.map(([key, val]) => (
              <div key={key}>{renderField(key, renderNested(val))}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DatasetCard;
