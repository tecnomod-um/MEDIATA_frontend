import {it, expect, vi} from "vitest";
import {waitForDiscoveryJob} from "./waitForDiscoveryJob";

it("waits for completion before returning results", async () => {
  const status = vi.fn().mockResolvedValueOnce({state:"RUNNING"}).mockResolvedValue({state:"DONE"});
  const result = vi.fn().mockResolvedValue(["released"]), cancel = vi.fn();
  expect(await waitForDiscoveryJob({status,result,cancel,interval:1})).toEqual(["released"]);
  expect(status).toHaveBeenCalledTimes(2);
  expect(result).toHaveBeenCalledOnce();
  expect(cancel).not.toHaveBeenCalled();
});

it("cancels once on navigation during a wait without retrieving results", async () => {
  const controller = new AbortController(), cancel = vi.fn(), result = vi.fn();
  const status = vi.fn().mockResolvedValue({state:"RUNNING"});
  const pending = waitForDiscoveryJob({status,result,cancel,signal:controller.signal});
  await Promise.resolve();
  controller.abort();
  await expect(pending).rejects.toMatchObject({name:"AbortError"});
  expect(cancel).toHaveBeenCalledOnce();
  expect(result).not.toHaveBeenCalled();
});

it.each(["ERROR", "unknown", "CANCELED"])("rejects %s jobs and releases resources", async state => {
  const cancel = vi.fn(), result = vi.fn();
  await expect(waitForDiscoveryJob({status:async()=>({state}),result,cancel})).rejects.toThrow();
  expect(cancel).toHaveBeenCalledOnce();
  expect(result).not.toHaveBeenCalled();
});

it("does not retrieve results if aborted while the status request is outstanding", async () => {
  let finish;
  const controller = new AbortController(), cancel = vi.fn(), result = vi.fn();
  const pending = waitForDiscoveryJob({status:()=>new Promise(resolve=>{finish=resolve;}),result,cancel,signal:controller.signal});
  controller.abort(); finish({state:"DONE"});
  await expect(pending).rejects.toMatchObject({name:"AbortError"});
  expect(cancel).toHaveBeenCalledOnce();
  expect(result).not.toHaveBeenCalled();
});
