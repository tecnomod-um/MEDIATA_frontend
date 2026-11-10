import { useEffect, useRef, useState } from "react";

function download(blob, filename) {
  const urls = URL;
  const url = urls.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    // Allow the browser to start the download before releasing the object URL.
    setTimeout(() => urls.revokeObjectURL(url), 1000);
  }
}

export default function useStatisticsExport() {
  const worker = useRef(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const cancel = () => { worker.current?.terminate(); worker.current = null; setStatus(""); };
  useEffect(() => () => worker.current?.terminate(), []);
  const start = (request, onComplete) => {
    cancel(); setError(""); setStatus("Preparing statistics…");
    const fail = message => { cancel(); setError(message); };
    try {
      const job = new Worker(new URL("./statisticsExportWorker.js", import.meta.url), { type: "module" });
      worker.current = job;
      job.onerror = () => { if (worker.current === job) fail("The report could not be created. Please try again."); };
      job.onmessageerror = job.onerror;
      job.onmessage = ({ data }) => {
        if (worker.current !== job) return;
        if (data.error) { fail(data.error); return; }
        if (data.status) setStatus(data.status);
        if (data.blob) {
          try {
            download(data.blob, `MEDIATA-statistics-${new Date().toISOString().slice(0, 10)}.${request.format === "xlsx" ? "xlsx" : "zip"}`);
            cancel(); onComplete();
          } catch { fail("The report was created but could not be downloaded. Please try again."); }
        }
      };
      job.postMessage(request);
    } catch { fail("The report could not be started. Please try again."); }
  };
  return { start, cancel, status, error, clearError: () => setError("") };
}
