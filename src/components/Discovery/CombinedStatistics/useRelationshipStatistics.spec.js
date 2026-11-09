import {renderHook, act} from "@testing-library/react";
import {it, expect, vi, afterEach} from "vitest";
import useRelationshipStatistics from "./useRelationshipStatistics";

let workers;
function installWorker() {
  workers=[];
  vi.stubGlobal("Worker", class {
    constructor(){ workers.push(this); }
    postMessage=vi.fn();
    terminate=vi.fn();
  });
}
afterEach(()=>vi.unstubAllGlobals());

it("defers aggregate work, terminates stale workers and ignores late responses", () => {
  installWorker();
  const sources=[], first={}, second={}, stats={covariances:{Age:{Age:10}}};
  const hook=renderHook(({table,enabled})=>useRelationshipStatistics(table,sources,true,enabled),{initialProps:{table:first,enabled:false}});
  expect(workers).toHaveLength(0);
  hook.rerender({table:first,enabled:true});
  expect(hook.result.current.pending).toBe(true);
  expect(workers[0].postMessage).toHaveBeenCalledWith({table:first,sources,combined:true});
  hook.rerender({table:second,enabled:true});
  expect(workers[0].terminate).toHaveBeenCalled();
  act(()=>workers[0].onmessage({data:{statistics:stats}}));
  expect(hook.result.current.pending).toBe(true);
  act(()=>workers[1].onmessage({data:{statistics:stats}}));
  expect(hook.result.current.statistics).toEqual(stats);
  expect(hook.result.current.pending).toBe(false);
  hook.unmount();
  expect(workers[1].terminate).toHaveBeenCalled();
});

it("shows failures, supports retry and stops work on leaving aggregate view", () => {
  installWorker();
  const sources=[], table={};
  const hook=renderHook(({enabled})=>useRelationshipStatistics(table,sources,true,enabled),{initialProps:{enabled:true}});
  act(()=>workers[0].onerror());
  expect(hook.result.current.error).toContain("could not");
  expect(hook.result.current.pending).toBe(false);
  act(()=>hook.result.current.retry());
  expect(hook.result.current.pending).toBe(true);
  expect(workers).toHaveLength(2);
  hook.rerender({enabled:false});
  expect(workers[1].terminate).toHaveBeenCalled();
  expect(hook.result.current.pending).toBe(false);
  expect(hook.result.current.statistics.covariances).toEqual({});
});

it("reports unavailable workers instead of calculating on the UI thread", () => {
  vi.stubGlobal("Worker", undefined);
  const table = {}, sources = [];
  const hook = renderHook(() => useRelationshipStatistics(table, sources, true, true));
  expect(hook.result.current.pending).toBe(false);
  expect(hook.result.current.error).toContain("could not be calculated");
  expect(hook.result.current.statistics.covariances).toEqual({});
});
