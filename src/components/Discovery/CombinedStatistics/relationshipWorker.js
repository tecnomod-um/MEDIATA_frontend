import {combineMappedRelationships} from "./pairedStatistics.js";
import {visibleRelationships} from "../discoveryStatistics.js";

// Inputs are released aggregate summaries, never patient records.
self.onmessage = ({data}) => {
  try {
    self.postMessage({statistics: data.combined
      ? combineMappedRelationships(data.table, data.sources) : visibleRelationships(data.table)});
  } catch {
    self.postMessage({error: "Relationship statistics could not be calculated. Please retry."});
  }
};
