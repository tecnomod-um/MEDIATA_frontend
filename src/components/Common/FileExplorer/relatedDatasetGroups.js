import Papa from "papaparse";
import { generateDistinctColors } from "../../../util/colors";

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s:./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const relatedElementFileNameFor = (category, fileName) => {
  if (category === "DATASET_ELEMENTS") return fileName;

  const safeName = String(fileName || "").trim();
  const dotIndex = safeName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  return `${baseName}_elements.csv`;
};

const sanitizeDatasetFileName = (name) =>
  String(name || "").replace(/[^a-zA-Z0-9._-]/g, "_");

const stripExtension = (fileName) => {
  const safeName = String(fileName || "").trim();
  const dotIndex = safeName.lastIndexOf(".");
  return dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
};

const elementStemFor = (fileName) =>
  stripExtension(fileName).replace(/_elements$/i, "");

const normalizedStemForMatching = (fileName) =>
  elementStemFor(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const resolveRelatedElementFileName = (category, fileName, availableElementFiles = []) => {
  const available = Array.isArray(availableElementFiles) ? availableElementFiles : [];
  const availableSet = new Set(available.map((name) => String(name)));

  if (category === "DATASET_ELEMENTS") {
    const safeName = String(fileName || "").trim();
    return availableSet.has(safeName) ? safeName : safeName;
  }

  const rawStem = stripExtension(fileName);
  const sanitizedStem = stripExtension(sanitizeDatasetFileName(fileName));
  const directCandidates = [
    `${rawStem}_elements.csv`,
    `${sanitizedStem}_elements.csv`,
  ].filter(Boolean);

  for (const candidate of directCandidates) {
    if (availableSet.has(candidate)) return candidate;
  }

  const normalizedTargetStem = normalizedStemForMatching(fileName);
  const normalizedMatches = available.filter(
    (candidate) => normalizedStemForMatching(candidate) === normalizedTargetStem
  );

  if (normalizedMatches.length === 1) return normalizedMatches[0];

  return directCandidates[0] || "";
};

export const parseDatasetElementsCsv = (csvText) => {
  const parsed = Papa.parse(String(csvText || ""), {
    skipEmptyLines: true,
  });

  return Array.isArray(parsed.data) ? parsed.data : [];
};

const toElementValues = (row) =>
  row
    .slice(1)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

export const buildRelatedDatasetPayload = (files, elementCsvByKey) => {
  const elementFiles = [];
  const elementCountsByKey = {};

  (files || []).forEach((file) => {
    const key = `${file?.nodeId || "default"}::${file?.name || ""}`;
    const csvText = elementCsvByKey?.[key];
    if (!csvText) return;

    const rows = parseDatasetElementsCsv(csvText)
      .filter((row) => Array.isArray(row) && String(row[0] ?? "").trim());

    elementCountsByKey[key] = rows.length;

    rows.forEach((row) => {
      if (!Array.isArray(row) || row.length === 0) return;

      const column = String(row[0] ?? "").trim();
      if (!column) return;

      elementFiles.push({
        nodeId: String(file?.nodeId || "default"),
        fileName: String(file?.name || ""),
        column,
        values: toElementValues(row),
        color: "",
      });
    });
  });

  return { elementFiles, elementCountsByKey };
};

export const buildRelatedDatasetPayloadFromExtractedElements = (files, extractedElementsByKey) => {
  const elementFiles = [];
  const elementCountsByKey = {};

  (files || []).forEach((file) => {
    const key = `${file?.nodeId || "default"}::${file?.name || ""}`;
    const extracted = extractedElementsByKey?.[key];
    const elements = Array.isArray(extracted?.elements) ? extracted.elements : [];

    elementCountsByKey[key] = elements.filter((element) => String(element?.column || "").trim()).length;

    elements.forEach((element) => {
      const column = String(element?.column || "").trim();
      if (!column) return;

      elementFiles.push({
        nodeId: String(file?.nodeId || "default"),
        fileName: String(file?.name || ""),
        column,
        values: Array.isArray(element?.values)
          ? element.values.map((value) => String(value ?? "").trim()).filter(Boolean)
          : [],
        color: "",
      });
    });
  });

  return { elementFiles, elementCountsByKey };
};

class DisjointSet {
  constructor(items) {
    this.parent = new Map(items.map((item) => [item, item]));
  }

  find(item) {
    const parent = this.parent.get(item);
    if (!parent) return item;
    if (parent === item) return item;
    const root = this.find(parent);
    this.parent.set(item, root);
    return root;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) {
      this.parent.set(rightRoot, leftRoot);
    }
  }
}

const summarizeEvidence = (labels) => {
  const list = Array.from(labels).filter(Boolean);
  if (!list.length) return "likely related dataset";
  if (list.length === 1) return `shared element theme: ${list[0]}`;
  if (list.length === 2) return `shared element themes: ${list[0]}, ${list[1]}`;
  return `shared element themes: ${list[0]}, ${list[1]}, +${list.length - 2} more`;
};

const pairKeyFor = (leftKey, rightKey) =>
  [leftKey, rightKey].sort((a, b) => a.localeCompare(b)).join("~~");

const harmonicMean = (left, right) => {
  if (left <= 0 || right <= 0) return 0;
  return (2 * left * right) / (left + right);
};

const getDistinctColumnKey = (ref) => {
  const nodeId = String(ref?.nodeId || "default");
  const fileName = String(ref?.fileName || "");
  const groupColumn = String(ref?.groupColumn || "").trim();

  if (ref?.groupKey) return String(ref.groupKey);
  if (!groupColumn) return "";
  return `${nodeId}::${fileName}::${groupColumn}`;
};

const collectMappingColumnRefs = (mapping) => {
  const refsByFileKey = new Map();

  (mapping?.groups || []).forEach((group) => {
    (group?.values || []).forEach((value) => {
      (value?.mapping || []).forEach((ref) => {
        if (!ref?.fileName) return;

        const nodeId = String(ref?.nodeId || "default");
        const fileName = String(ref.fileName);
        const fileKey = `${nodeId}::${fileName}`;
        const columnKey = getDistinctColumnKey(ref);

        if (!refsByFileKey.has(fileKey)) {
          refsByFileKey.set(fileKey, {
            nodeId,
            fileName,
            fileKey,
            columnKeys: new Set(),
          });
        }

        if (columnKey) refsByFileKey.get(fileKey).columnKeys.add(columnKey);
      });
    });
  });

  return Array.from(refsByFileKey.values());
};

const shouldLinkDatasetPair = (leftMatched, rightMatched, leftTotal, rightTotal) => {
  const matchedMin = Math.min(leftMatched, rightMatched);
  if (matchedMin <= 0) return false;

  if (leftTotal === 1 && rightTotal === 1 && matchedMin === 1) return true;

  const leftCoverage = leftMatched / leftTotal;
  const rightCoverage = rightMatched / rightTotal;
  const balancedCoverage = harmonicMean(leftCoverage, rightCoverage);

  if (matchedMin >= 3 && balancedCoverage >= 0.35) return true;
  if (matchedMin >= 2 && balancedCoverage >= 0.5) return true;

  return false;
};

const normalizeElementValues = (values) =>
  (Array.isArray(values) ? values : [])
    .map((value) => normalizeToken(value))
    .filter(Boolean);

const buildElementSignature = (element) => {
  const normalizedValues = normalizeElementValues(element?.values);
  if (!normalizedValues.length) return "";

  const typeToken = normalizedValues[0];
  if (typeToken === "integer" || typeToken === "double" || typeToken === "date") {
    return `${typeToken}::${normalizedValues.slice(1).join("|")}`;
  }

  return `set::${normalizedValues.slice().sort().join("|")}`;
};

const buildElementMatchCandidates = (leftElements, rightElements) => {
  const candidates = [];

  leftElements.forEach((leftElement, leftIndex) => {
    const leftColumn = normalizeToken(leftElement?.column);
    const leftSignature = buildElementSignature(leftElement);
    if (!leftColumn && !leftSignature) return;

    rightElements.forEach((rightElement, rightIndex) => {
      const rightColumn = normalizeToken(rightElement?.column);
      const rightSignature = buildElementSignature(rightElement);
      if (!rightColumn && !rightSignature) return;

      const sameName = leftColumn && rightColumn && leftColumn === rightColumn;
      const sameSignature = leftSignature && rightSignature && leftSignature === rightSignature;

      let score = 0;
      if (sameName && sameSignature) score = 3;
      else if (sameSignature) score = 2;
      else if (sameName) score = 1;

      if (score >= 2) {
        candidates.push({
          leftIndex,
          rightIndex,
          score,
          leftColumn: String(leftElement?.column || ""),
          rightColumn: String(rightElement?.column || ""),
        });
      }
    });
  });

  return candidates.sort((left, right) => right.score - left.score);
};

const collectHeuristicPairEvidence = (files, elementFiles) => {
  const filesByKey = new Map(
    (files || []).map((file) => [`${file?.nodeId || "default"}::${file?.name || ""}`, file])
  );
  const elementsByFileKey = new Map();

  (elementFiles || []).forEach((element, index) => {
    const fileKey = `${element?.nodeId || "default"}::${element?.fileName || ""}`;
    if (!filesByKey.has(fileKey)) return;

    const bucket = elementsByFileKey.get(fileKey) || [];
    bucket.push({
      ...element,
      __index: index,
    });
    elementsByFileKey.set(fileKey, bucket);
  });

  const pairEvidenceByKey = new Map();
  const fileEntries = Array.from(elementsByFileKey.entries());

  for (let leftIndex = 0; leftIndex < fileEntries.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fileEntries.length; rightIndex += 1) {
      const [leftFileKey, leftElements] = fileEntries[leftIndex];
      const [rightFileKey, rightElements] = fileEntries[rightIndex];
      const matches = buildElementMatchCandidates(leftElements, rightElements);
      if (!matches.length) continue;

      const usedLeft = new Set();
      const usedRight = new Set();
      const leftMatchedColumns = new Set();
      const rightMatchedColumns = new Set();

      matches.forEach((match) => {
        if (usedLeft.has(match.leftIndex) || usedRight.has(match.rightIndex)) return;
        usedLeft.add(match.leftIndex);
        usedRight.add(match.rightIndex);
        leftMatchedColumns.add(`${leftFileKey}::heuristic::${match.leftColumn || match.leftIndex}`);
        rightMatchedColumns.add(`${rightFileKey}::heuristic::${match.rightColumn || match.rightIndex}`);
      });

      if (!leftMatchedColumns.size || !rightMatchedColumns.size) continue;

      pairEvidenceByKey.set(pairKeyFor(leftFileKey, rightFileKey), {
        leftFileKey,
        rightFileKey,
        matchedColumnsByFileKey: new Map([
          [leftFileKey, leftMatchedColumns],
          [rightFileKey, rightMatchedColumns],
        ]),
        labels: new Set(["shared value pattern"]),
      });
    }
  }

  return pairEvidenceByKey;
};

const mergePairEvidence = (basePairEvidenceByKey, extraPairEvidenceByKey) => {
  extraPairEvidenceByKey.forEach((pairEvidence, evidenceKey) => {
    if (!basePairEvidenceByKey.has(evidenceKey)) {
      basePairEvidenceByKey.set(evidenceKey, pairEvidence);
      return;
    }

    const existing = basePairEvidenceByKey.get(evidenceKey);
    pairEvidence.labels.forEach((label) => existing.labels.add(label));

    pairEvidence.matchedColumnsByFileKey.forEach((columns, fileKey) => {
      const existingColumns = existing.matchedColumnsByFileKey.get(fileKey) || new Set();
      columns.forEach((column) => existingColumns.add(column));
      existing.matchedColumnsByFileKey.set(fileKey, existingColumns);
    });
  });
};

export const buildRelatedDatasetAnalysisFromSuggestions = (
  files,
  suggestionResponse,
  elementCountsByKey = {},
  elementFiles = []
) => {
  const hierarchy = Array.isArray(suggestionResponse?.hierarchy) ? suggestionResponse.hierarchy : [];

  const displayedFilesByKey = new Map(
    (files || []).map((file) => [`${file?.nodeId || "default"}::${file?.name || ""}`, file])
  );
  const pairEvidenceByKey = new Map();
  const dsu = new DisjointSet([]);
  const relatedFileKeys = new Set();

  hierarchy.forEach((entry) => {
    Object.entries(entry || {}).forEach(([mappingKey, mapping]) => {
      const refsByFile = collectMappingColumnRefs(mapping)
        .filter((ref) => displayedFilesByKey.has(ref.fileKey));
      const fileKeys = refsByFile.map((ref) => ref.fileKey);

      if (fileKeys.length < 2) return;

      const label = normalizeToken(mapping?.description || mapping?.terminology || mappingKey);

      for (let leftIndex = 0; leftIndex < refsByFile.length - 1; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < refsByFile.length; rightIndex += 1) {
          const leftRef = refsByFile[leftIndex];
          const rightRef = refsByFile[rightIndex];
          const evidenceKey = pairKeyFor(leftRef.fileKey, rightRef.fileKey);

          if (!pairEvidenceByKey.has(evidenceKey)) {
            pairEvidenceByKey.set(evidenceKey, {
              leftFileKey: leftRef.fileKey,
              rightFileKey: rightRef.fileKey,
              matchedColumnsByFileKey: new Map(),
              labels: new Set(),
            });
          }

          const pairEvidence = pairEvidenceByKey.get(evidenceKey);
          const leftColumns = pairEvidence.matchedColumnsByFileKey.get(leftRef.fileKey) || new Set();
          const rightColumns = pairEvidence.matchedColumnsByFileKey.get(rightRef.fileKey) || new Set();
          leftRef.columnKeys.forEach((columnKey) => leftColumns.add(columnKey));
          rightRef.columnKeys.forEach((columnKey) => rightColumns.add(columnKey));
          pairEvidence.matchedColumnsByFileKey.set(leftRef.fileKey, leftColumns);
          pairEvidence.matchedColumnsByFileKey.set(rightRef.fileKey, rightColumns);
          if (label) pairEvidence.labels.add(label);
        }
      }
    });
  });

  mergePairEvidence(
    pairEvidenceByKey,
    collectHeuristicPairEvidence(files, elementFiles)
  );

  pairEvidenceByKey.forEach((pairEvidence) => {
    const { leftFileKey, rightFileKey, matchedColumnsByFileKey } = pairEvidence;
    const leftMatched = matchedColumnsByFileKey.get(leftFileKey)?.size || 0;
    const rightMatched = matchedColumnsByFileKey.get(rightFileKey)?.size || 0;
    const leftTotal = Math.max(leftMatched, Number(elementCountsByKey?.[leftFileKey]) || 0, 1);
    const rightTotal = Math.max(rightMatched, Number(elementCountsByKey?.[rightFileKey]) || 0, 1);

    if (!shouldLinkDatasetPair(leftMatched, rightMatched, leftTotal, rightTotal)) return;

    [leftFileKey, rightFileKey].forEach((key) => {
      if (!dsu.parent.has(key)) dsu.parent.set(key, key);
      relatedFileKeys.add(key);
    });
    dsu.union(leftFileKey, rightFileKey);
  });

  const membersByRoot = new Map();
  relatedFileKeys.forEach((key) => {
    const root = dsu.find(key);
    const bucket = membersByRoot.get(root) || [];
    bucket.push({ key, file: displayedFilesByKey.get(key) });
    membersByRoot.set(root, bucket);
  });

  const groupedMembers = Array.from(membersByRoot.entries())
    .filter(([, members]) => members.length >= 2)
    .map(([root, members]) => {
      const evidence = new Set();
      let matchedColumns = 0;
      let matchedColumnsPerFile = Number.POSITIVE_INFINITY;
      let balancedCoverageScore = 0;

      for (let leftIndex = 0; leftIndex < members.length - 1; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
          const leftKey = members[leftIndex].key;
          const rightKey = members[rightIndex].key;
          const pairEvidence = pairEvidenceByKey.get(pairKeyFor(leftKey, rightKey));
          if (!pairEvidence) continue;

          pairEvidence.labels.forEach((label) => evidence.add(label));

          const leftMatched = pairEvidence.matchedColumnsByFileKey.get(leftKey)?.size || 0;
          const rightMatched = pairEvidence.matchedColumnsByFileKey.get(rightKey)?.size || 0;
          const sharedMatchCount = Math.min(leftMatched, rightMatched);
          if (sharedMatchCount > 0) {
            matchedColumns = Math.max(matchedColumns, sharedMatchCount);
            matchedColumnsPerFile = Math.min(matchedColumnsPerFile, sharedMatchCount);
          }

          const leftTotal = Math.max(leftMatched, Number(elementCountsByKey?.[leftKey]) || 0, 1);
          const rightTotal = Math.max(rightMatched, Number(elementCountsByKey?.[rightKey]) || 0, 1);
          const pairCoverage = harmonicMean(leftMatched / leftTotal, rightMatched / rightTotal);
          balancedCoverageScore = Math.max(balancedCoverageScore, pairCoverage);
        }
      }

      if (!Number.isFinite(matchedColumnsPerFile)) matchedColumnsPerFile = matchedColumns;
      return {
        members,
        evidence,
        matchedColumns,
        matchedColumnsPerFile,
        balancedCoverageScore,
      };
    })
    .sort((left, right) =>
      right.members.length - left.members.length
      || right.matchedColumns - left.matchedColumns
      || right.balancedCoverageScore - left.balancedCoverageScore
    );

  const groupColors = generateDistinctColors(groupedMembers.length) || [];
  const groups = groupedMembers.map((group, index) => ({
      ...group,
      groupId: `G${index + 1}`,
      color: groupColors[index] || "var(--button-color)",
    }));

  const groupInfoByKey = new Map();

  groups.forEach((group, groupIndex) => {
    const evidenceSummary = summarizeEvidence(group.evidence);
    group.members.forEach((member) => {
      const companion = group.members.find((candidate) => candidate.key !== member.key);
      const totalColumns = Math.max(Number(elementCountsByKey?.[member.key]) || 0, 1);
      const matchedColumns = Math.min(group.matchedColumnsPerFile || group.matchedColumns || 0, totalColumns);

      groupInfoByKey.set(member.key, {
        groupId: group.groupId,
        groupOrder: groupIndex,
        color: group.color,
        memberCount: group.members.length,
        title: companion?.file?.name
          ? `${group.groupId} • ${matchedColumns}/${totalColumns} matched elements • ${evidenceSummary} • also grouped with ${companion.file.name}`
          : `${group.groupId} • ${matchedColumns}/${totalColumns} matched elements • ${evidenceSummary}`,
      });
    });
  });

  return {
    groups: groups.map((group) => ({
      groupId: group.groupId,
      color: group.color,
      count: group.members.length,
    })),
    groupInfoByKey,
  };
};
