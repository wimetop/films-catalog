import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorkerHeartbeat } from "./heartbeat";

describe("createWorkerHeartbeat", () => {
  afterEach(() => vi.useRealTimers());

  it("refreshes only after a processed job and probes work on the liveness interval", async () => {
    vi.useFakeTimers();
    const set = vi.fn().mockResolvedValue("OK");
    const heartbeat = createWorkerHeartbeat({ set }, "cat:v1:worker:heartbeat", 30);
    const probe = vi.fn().mockResolvedValue(undefined);

    await heartbeat.afterJob();
    heartbeat.start(probe, vi.fn());
    await vi.advanceTimersByTimeAsync(10_000);
    heartbeat.stop();

    expect(set).toHaveBeenCalledOnce();
    expect(probe).toHaveBeenCalledOnce();
    expect(set).toHaveBeenLastCalledWith("cat:v1:worker:heartbeat", expect.any(String), "EX", 30);
  });
});
