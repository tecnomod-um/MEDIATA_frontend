// Both profiling and refresh jobs return only disclosure-approved summaries.
export async function waitForDiscoveryJob({status, result, cancel, signal, interval = 1000}) {
  const aborted = () => new DOMException("Statistics refresh canceled", "AbortError");
  let cancellation;
  const cancelOnce = () => { cancellation ||= Promise.resolve().then(cancel).catch(() => {}); };
  const onAbort = () => cancelOnce();
  signal?.addEventListener("abort", onAbort, {once:true});
  try {
    for (;;) {
      if (signal?.aborted) throw aborted();
      const response = await status();
      if (signal?.aborted) throw aborted();
      if (response?.state === "DONE") {
        const released = await result();
        if (signal?.aborted) throw aborted();
        return released;
      }
      if (response?.state === "CANCELED") throw aborted();
      if (response?.state === "ERROR") throw new Error("The node could not refresh statistics. The previous results were kept.");
      if (response?.state !== "RUNNING") throw new Error("Invalid statistics job response.");
      await new Promise((resolve, reject) => {
        const stop = () => { clearTimeout(timer); reject(aborted()); };
        const timer = setTimeout(() => { signal?.removeEventListener("abort", stop); resolve(); }, interval);
        signal?.addEventListener("abort", stop, {once:true});
        if (signal?.aborted) stop();
      });
    }
  } catch (error) {
    cancelOnce();
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
