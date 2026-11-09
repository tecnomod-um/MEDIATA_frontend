import {useEffect, useState} from "react";

const empty = {covariances:{}, pearsonCorrelations:{}, spearmanCorrelations:{}, chiSquareTest:[], omittedFeatures:[]};

export default function useRelationshipStatistics(table, sources, combined, enabled) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!enabled || !table) return;
    let active = true, worker;
    const complete = data => {
      if (active) setResult({table, sources, combined, attempt, ...data});
      worker?.terminate();
    };
    try {
      worker = new Worker(new URL("./relationshipWorker.js", import.meta.url), {type:"module"});
      worker.onmessage = event => complete(event.data);
      worker.onerror = () => complete({error:"Relationship statistics could not be calculated. Please retry."});
      worker.postMessage({table, sources, combined});
    } catch {
      complete({error:"Relationship statistics could not be calculated. Please retry."});
    }
    return () => { active = false; worker?.terminate(); };
  }, [enabled, table, sources, combined, attempt]);

  const current = result?.table === table && result?.sources === sources && result?.combined === combined && result?.attempt === attempt;
  return {
    statistics: !enabled ? empty : current ? result.statistics || empty : empty,
    pending: Boolean(enabled && table && !current),
    error: enabled && current ? result.error : null,
    retry: () => setAttempt(value => value + 1),
  };
}
