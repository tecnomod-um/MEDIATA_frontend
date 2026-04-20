import Papa from "papaparse";
import { getNodeElements, fetchElementFile } from "./petitionHandler";
import { updateNodeAxiosBaseURL } from "./nodeAxiosSetup";
import { collectSpecSources, collectRequiredColumnsBySource } from "./uploadedMappingSpec";

async function fetchLiveElementFilesByNode(selectedNodes) {
  const result = new Map();

  await Promise.all(
    (selectedNodes || []).map(async (node) => {
      try {
        updateNodeAxiosBaseURL(node.serviceUrl);
        const files = await getNodeElements();

        result.set(String(node.nodeId), {
          nodeId: String(node.nodeId),
          nodeName: node.name || String(node.nodeId),
          files: Array.isArray(files) ? files : [],
        });
      } catch (error) {
        console.error(`Failed to fetch element files for node ${node.nodeId}:`, error);

        result.set(String(node.nodeId), {
          nodeId: String(node.nodeId),
          nodeName: node.name || String(node.nodeId),
          files: [],
        });
      }
    })
  );

  return result;
}

function parseElementFileColumns(text) {
  const result = Papa.parse(text, {
    skipEmptyLines: true,
  });

  return result.data
    .map((row) => String(row?.[0] ?? "").trim())
    .filter(Boolean);
}

async function analyzeUploadedSpecAvailabilityLive(spec, selectedNodes, liveFilesByNodeArg = null) {
  const sourceRefs = collectSpecSources(spec);
  const liveFilesByNode = liveFilesByNodeArg || await fetchLiveElementFilesByNode(selectedNodes);

  const selectedNodeIds = new Set((selectedNodes || []).map((n) => String(n.nodeId)));

  const resolved = [];
  const missing = [];

  sourceRefs.forEach((ref) => {
    const nodeId = String(ref.nodeId || "");
    const fileName = String(ref.fileName || "");
    const sourceId = `${nodeId}::${fileName}`;

    const nodeSelected = selectedNodeIds.has(nodeId);
    const nodeEntry = liveFilesByNode.get(nodeId);
    const nodeFiles = nodeEntry?.files || [];
    const fileExists = nodeSelected && nodeFiles.includes(fileName);

    if (nodeSelected && fileExists) {
      resolved.push({
        ...ref,
        sourceId,
        displayFileName: fileName,
        displayNodeName: nodeEntry?.nodeName || "",
      });
      return;
    }

    let candidateNodes = [];

    if (!nodeSelected) {
      candidateNodes = Array.from(liveFilesByNode.values()).map((entry) => ({
        nodeId: entry.nodeId,
        nodeName: entry.nodeName,
        files: entry.files,
      }));
    } else {
      candidateNodes = [
        {
          nodeId,
          nodeName: nodeEntry?.nodeName || "",
          files: nodeFiles,
        },
      ];
    }

    missing.push({
      sourceId,
      nodeId,
      fileName,
      displayFileName: fileName,
      displayNodeName: nodeEntry?.nodeName || "",
      reason: !nodeSelected ? "missing-node" : "missing-file",
      candidateNodes,
    });
  });

  const requiredColumnsBySource = missing.length > 0
    ? collectRequiredColumnsBySource(spec)
    : {};

  return {
    sourceRefs,
    resolved,
    missing: missing.map((ref) => ({
      ...ref,
      requiredColumns: requiredColumnsBySource[ref.sourceId] || [],
    })),
    requiresResolution: missing.length > 0,
    requiredColumnsBySource,
    liveFilesByNode,
  };
}

async function checkReplacementFileCompatibility({
  selectedNodes,
  sourceId,
  replacementNodeId,
  replacementFileName,
  requiredColumnsBySource,
}) {
  const requiredColumns = requiredColumnsBySource?.[sourceId] || [];

  if (!replacementNodeId || !replacementFileName) {
    return {
      compatible: false,
      requiredColumns,
      candidateColumns: [],
      missingColumns: requiredColumns,
      warning: "No replacement file selected.",
    };
  }

  const node = (selectedNodes || []).find(
    (n) => String(n.nodeId) === String(replacementNodeId)
  );

  if (!node) {
    return {
      compatible: false,
      requiredColumns,
      candidateColumns: [],
      missingColumns: requiredColumns,
      warning: "Selected node is not available.",
    };
  }

  updateNodeAxiosBaseURL(node.serviceUrl);
  const text = await fetchElementFile(replacementFileName);
  const candidateColumns = parseElementFileColumns(text);
  const candidateSet = new Set(candidateColumns.map((c) => String(c).trim()));

  const missingColumns = requiredColumns.filter((col) => !candidateSet.has(String(col).trim()));

  return {
    compatible: missingColumns.length === 0,
    requiredColumns,
    candidateColumns,
    missingColumns,
    warning:
      missingColumns.length > 0
        ? `Selected file is missing ${missingColumns.length} required column${missingColumns.length !== 1 ? "s" : ""}.`
        : "",
  };
}

export {
  fetchLiveElementFilesByNode,
  analyzeUploadedSpecAvailabilityLive,
  checkReplacementFileCompatibility,
};
