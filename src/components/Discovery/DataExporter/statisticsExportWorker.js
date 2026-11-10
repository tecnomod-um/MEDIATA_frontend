import { buildStatisticsReport } from "./statisticsReport";
import { writeStatisticsReport } from "./writeStatisticsReport";

self.onmessage = async event => {
  try {
    self.postMessage({ status: "Preparing statistics…" });
    const sheets = buildStatisticsReport(event.data);
    self.postMessage({ status: event.data.format === "xlsx" ? "Creating workbook…" : "Creating CSV tables…" });
    const blob = await writeStatisticsReport(sheets, event.data.format);
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error.message || "The statistics report could not be created." });
  }
};
