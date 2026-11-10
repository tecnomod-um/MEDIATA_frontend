import React, { useEffect, useId, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import { MdAdd, MdClose, MdDeleteOutline, MdLink } from "react-icons/md";
import { memberKey, sourceColumns, validateColumnMappings, changeMappingType } from "../CombinedStatistics/columnMappings";
import { sourceKey, sourceLabel } from "../CombinedStatistics/combinedStatistics";
import styles from "./columnMappings.module.css";
import FilterIndicator from "../FilterModal/filterIndicator";
import { sourceFilter, combinedFilter } from "../FilterModal/appliedFilters";
import { selectedMappings } from "../CombinedStatistics/selectedMappings";

const typeLabels = { continuous: "Numerical", categorical: "Categorical", date: "Date" };
const noSelection = [];

export default function ColumnMappingsDialog({ open, mappings, sources, onClose, onApply, appliedFilters, selectedFeatures = noSelection }) {
  const [draft, setDraft] = useState(() => selectedMappings(mappings, sources, selectedFeatures));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleId = useId(), descriptionId = useId();
  useEffect(() => {
    if (!open) return;
    setDraft(selectedMappings(mappings, sources, selectedFeatures));
    setError("");
  }, [open, mappings, sources, selectedFeatures]);

  const updateGroup = (id, update) => {
    setDraft(previous => previous.map(group => group.id === id ? { ...group, ...update } : group));
    setError("");
  };
  const addCombination = () => {
    setDraft(previous => [...previous, { id: crypto.randomUUID(), label: "", type: "continuous", members: [] }]);
    setError("");
  };
  const setColumn = (group, source, option) => {
    const members = group.members.filter(member => sourceKey(member) !== sourceKey(source));
    if (option) members.push({ nodeId: source.nodeId, fileName: source.fileName, column: option.column });
    members.sort((a, b) => sources.findIndex(source => sourceKey(source) === sourceKey(a)) - sources.findIndex(source => sourceKey(source) === sourceKey(b)));
    updateGroup(group.id, { members, type: option?.type || group.type, label: group.label || option?.column || "" });
  };
  const save = async () => {
    const next = draft.map(group => ({ ...group, label: group.label.trim() }));
    const invalid = validateColumnMappings(next, sources);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError("");
    try { await onApply(next); onClose(); }
    catch (failure) { setError(failure.message || "Could not combine features."); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onClose={() => { if (!saving) onClose(); }} maxWidth={false} fullWidth
    aria-labelledby={titleId} aria-describedby={descriptionId} slotProps={{ paper: { className: styles.dialog } }}>
    <DialogTitle id={`${titleId}-heading`} className={styles.dialogTitle}>
      <span id={titleId}><MdLink aria-hidden="true" />Combine feature statistics</span>
      <IconButton size="small" aria-label="Close combine feature statistics" disabled={saving} onClick={onClose}><MdClose /></IconButton>
    </DialogTitle>
    <DialogContent className={styles.dialogContent}>
      <p id={descriptionId} className={styles.description}>Link source features to combine their statistics. Leave a file blank to exclude it.</p>
      {error && <Alert severity="error" className={styles.error}>{error}</Alert>}
      {draft.length ? <div className={styles.matrixScroll} role="region" aria-label="Scrollable feature combinations" tabIndex={0}>
        <Table size="small" aria-label="Feature combinations across files" className={styles.matrix} style={{ "--source-count": sources.length }}>
          <colgroup>
            <col className={styles.outputColumn} /><col className={styles.typeColumn} />
            {sources.map(source => <col key={sourceKey(source)} className={styles.sourceColumn} />)}
            <col className={styles.actionColumn} />
          </colgroup>
          <TableHead><TableRow>
            <TableCell className={styles.outputHeading}><span className={styles.headingLabel}>Combined name</span></TableCell>
            <TableCell><span className={styles.headingLabel}>Type</span></TableCell>
            {sources.map(source => <TableCell key={sourceKey(source)} title={sourceLabel(source)}><div className={styles.sourceHeading}><strong>{source.nodeName || source.nodeId}<FilterIndicator description={sourceFilter(appliedFilters, source)} /></strong><span>{source.fileName}</span></div></TableCell>)}
            <TableCell className={styles.actionHeading}><span className={styles.srOnly}>Remove combination</span></TableCell>
          </TableRow></TableHead>
          <TableBody>{draft.map((group, index) => {
            const groupSources = group.members.map(member => sources.find(source => sourceKey(source) === sourceKey(member)) || member);
            const groupFilter = combinedFilter(appliedFilters, groupSources);
            return <TableRow key={group.id}>
            <TableCell className={styles.outputCell}>
              <TextField size="small" fullWidth value={group.label} placeholder="Combined feature name" disabled={saving} autoFocus={!group.label && index === draft.length - 1}
                InputProps={{ startAdornment: groupFilter ? <InputAdornment position="start" className={styles.filterAdornment}><FilterIndicator description={groupFilter} /></InputAdornment> : undefined }}
                inputProps={{ "aria-label": `Combined feature name ${index + 1}` }} onChange={event => updateGroup(group.id, { label: event.target.value })} />
            </TableCell>
            <TableCell>
              <Select size="small" fullWidth className={styles.typeSelect} value={group.type} displayEmpty disabled={saving}
                inputProps={{ "aria-label": `Feature type for combination ${index + 1}` }}
                title="Changing type clears incompatible source selections"
                MenuProps={{ slotProps: { paper: { className: styles.optionsPaper } } }}
                onChange={event => updateGroup(group.id, changeMappingType(group, event.target.value, sources))}>
                <MenuItem value="" disabled>Select type</MenuItem>
                {Object.entries(typeLabels).map(([type, label]) => <MenuItem key={type} value={type}>{label}</MenuItem>)}
              </Select>
            </TableCell>
            {sources.map(source => {
              const options = sourceColumns(source).filter(option => !group.type || option.type === group.type || option.unavailable);
              const member = group.members.find(member => sourceKey(member) === sourceKey(source));
              const value = member ? options.find(option => option.column === member.column) || { column: member.column, type: group.type } : null;
              const used = new Set(draft.filter(other => other.id !== group.id).flatMap(other => other.members.map(memberKey)));
              return <TableCell key={sourceKey(source)}>
                <Autocomplete size="small" options={options} value={value} disabled={saving}
                  getOptionLabel={option => option.column} isOptionEqualToValue={(a, b) => a.column === b.column}
                  getOptionDisabled={option => Boolean(option.unavailable || (group.type && option.type !== group.type) || used.has(memberKey({ ...source, column: option.column })))}
                  onChange={(_, option) => setColumn(group, source, option)}
                  slotProps={{ paper: { className: styles.optionsPaper } }}
                  renderInput={params => <TextField {...params} placeholder="Not included" inputProps={{ ...params.inputProps, "aria-label": `Feature from ${sourceLabel(source)} in combination ${index + 1}` }}
                    InputProps={{ ...params.InputProps, startAdornment: <>{params.InputProps.startAdornment}{value && sourceFilter(appliedFilters, source) && <InputAdornment position="start" className={styles.filterAdornment}><FilterIndicator description={sourceFilter(appliedFilters, source)} /></InputAdornment>}</> }} />}
                  renderOption={(props, option) => { const { key, ...rest } = props; return <li key={key} {...rest}><span className={styles.optionLabel}>{option.column}<FilterIndicator description={sourceFilter(appliedFilters, source)} /><small>{typeLabels[option.type] || "Unavailable"}</small></span></li>; }} />
              </TableCell>;
            })}
            <TableCell className={styles.actionCell}><IconButton className={styles.deleteButton} size="small" aria-label={`Remove combination ${group.label || index + 1}`} disabled={saving} onClick={() => setDraft(previous => previous.filter(item => item.id !== group.id))}><MdDeleteOutline /></IconButton></TableCell>
          </TableRow>;
          })}</TableBody>
        </Table>
      </div> : <Button className={styles.empty} startIcon={<MdAdd />} disabled={saving} onClick={addCombination}>
        Add a combination to link features from different files.
      </Button>}
      {draft.length > 0 && <Button startIcon={<MdAdd />} size="small" className={styles.addMapping} disabled={saving}
        onClick={addCombination}>Add combination</Button>}
    </DialogContent>
    <DialogActions className={styles.dialogActions}>
      <span>{selectedFeatures.length > 0 && `${selectedFeatures.length} selected features · `}{draft.length} combinations · {sources.length} datasets{appliedFilters?.size > 0 && <span className={styles.filterLegend}> · <FilterIndicator description="One or more source cohorts have active filters" /> Filtered records</span>}</span>
      <Button onClick={onClose} disabled={saving}>Cancel</Button>
      <Button variant="contained" disableElevation onClick={save} disabled={saving}>{saving ? "Applying…" : "Apply combinations"}</Button>
    </DialogActions>
  </Dialog>;
}
