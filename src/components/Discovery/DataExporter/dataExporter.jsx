import React, { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import { MdClose } from "react-icons/md";
import { exportFeatures } from "./statisticsReport";
import useStatisticsExport from "./useStatisticsExport";
import styles from "./dataExporter.module.css";

export default function DataExporter({ statisticsExport, relationshipExport, selectedEntries = [], onRelationshipsChange, busy }) {
  const [open, setOpen] = useState(false);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [format, setFormat] = useState("xlsx");
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [includeRelationships, setIncludeRelationships] = useState(false);
  const job = useStatisticsExport();
  const allFeatures = useMemo(() => exportFeatures(statisticsExport?.data, statisticsExport?.sourceData), [statisticsExport]);
  const selected = useMemo(() => exportFeatures(statisticsExport?.data, statisticsExport?.sourceData, selectedEntries, true), [statisticsExport, selectedEntries]);
  const scoped = selectedOnly ? selected : allFeatures;
  const hasPooled = scoped.some(feature => feature.pooled);
  const start = () => {
    setSelectedOnly(selected.length > 0);
    setIncludeBreakdown(true);
    setIncludeRelationships(Boolean(relationshipExport?.active));
    job.clearError(); setOpen(true); onRelationshipsChange?.(Boolean(relationshipExport?.active));
  };
  const close = () => { job.cancel(); setOpen(false); onRelationshipsChange?.(false); };
  const loadingRelationships = includeRelationships && relationshipExport?.pending;
  const relationshipError = includeRelationships && relationshipExport?.error;
  const download = () => job.start({ ...statisticsExport, selectedEntries, selectedOnly, format,
    includeBreakdown: hasPooled && includeBreakdown, includeRelationships, relationships: relationshipExport?.data }, close);

  return <>
    <button onClick={start} disabled={busy || !allFeatures.length} aria-label="Export statistics">Export Data</button>
    <Dialog open={open} onClose={close} maxWidth={false} fullWidth aria-labelledby="statistics-export-title"
      slotProps={{ paper: { className: styles.dialog } }}>
      <DialogTitle id="statistics-export-heading" className={styles.title}>
        <span id="statistics-export-title">Export statistics</span>
        <IconButton size="small" aria-label="Close export statistics" onClick={close}><MdClose /></IconButton>
      </DialogTitle>
      <DialogContent className={styles.content}>
        <p className={styles.description}>Download the current statistics, with their sources, filters and calculation methods.</p>
        <div className={styles.settings}>
          <fieldset disabled={Boolean(job.status)}><legend>Features</legend>
            <label><input type="radio" name="export-scope" checked={selectedOnly} disabled={!selected.length}
              onChange={() => setSelectedOnly(true)} />Selected features <span>{selected.length}</span></label>
            <label><input type="radio" name="export-scope" checked={!selectedOnly}
              onChange={() => setSelectedOnly(false)} />All visible features <span>{allFeatures.length}</span></label>
          </fieldset>
          <label className={styles.format}>Format
            <select aria-label="Export format" value={format} disabled={Boolean(job.status)} onChange={event => setFormat(event.target.value)}>
              <option value="xlsx">Excel workbook (.xlsx)</option>
              <option value="csv">CSV tables (.zip)</option>
            </select>
            <small>{format === "xlsx" ? "Separate worksheets, readable headings and numeric cells." : "The same tables as UTF-8 CSV files, in one download."}</small>
          </label>
        </div>
        <div className={styles.options}>
          {hasPooled && <label><input type="checkbox" checked={includeBreakdown} disabled={Boolean(job.status)} onChange={event => setIncludeBreakdown(event.target.checked)} />
            <span>Include per-dataset breakdown<small>Keep the pooled results and each contributing dataset together.</small></span></label>}
          <label><input type="checkbox" checked={includeRelationships} disabled={Boolean(job.status)} onChange={event => { setIncludeRelationships(event.target.checked); onRelationshipsChange?.(event.target.checked); }} />
            <span>Include relationships<small>Covariance, correlations and chi-square results for the exported features.</small></span></label>
        </div>
        {(job.error || relationshipError) && <Alert severity="error">{job.error || relationshipError} {relationshipError && "You can retry or export without relationships."}</Alert>}
        {(job.status || loadingRelationships) && <p className={styles.progress} role="status"><span className={styles.spinner} />{job.status || "Calculating relationships…"}</p>}
      </DialogContent>
      <DialogActions className={styles.actions}>
        <span>{scoped.length} {scoped.length === 1 ? "feature" : "features"}{hasPooled ? " · combined statistics" : " · individual datasets"}</span>
        <Button onClick={close}>{job.status ? "Cancel export" : "Cancel"}</Button>
        <Button variant="contained" disableElevation onClick={download}
          disabled={busy || Boolean(job.status || loadingRelationships || relationshipError) || !scoped.length}>
          {job.status ? "Exporting…" : "Download"}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
