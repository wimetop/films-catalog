import { describe, expect, it, vi } from "vitest";

import { createWorkerRuntime } from "./runtime";

describe("createWorkerRuntime", () => {
  it("does not refresh readiness until schedulers are restored", async () => {
    const events: string[] = [];
    const runtime = createWorkerRuntime({
      closeResources: vi.fn(), disconnectResources: vi.fn(), exit: vi.fn(),
      probeDependencies: async () => { events.push("probe"); },
      refreshHeartbeat: async () => { events.push("heartbeat"); },
      registerSchedulers: async () => { events.push("schedulers"); }, timeoutMs: 100,
    });
    await runtime.recoverSchedulers();
    expect(events).toEqual(["probe", "schedulers", "heartbeat"]);
  });

  it("disconnects and exits non-zero when shutdown exceeds its deadline", async () => {
    const disconnectResources = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const runtime = createWorkerRuntime({
      closeResources: () => new Promise<void>(() => undefined), disconnectResources, exit,
      probeDependencies: vi.fn(), refreshHeartbeat: vi.fn(), registerSchedulers: vi.fn(), timeoutMs: 1,
    });
    await runtime.shutdown("SIGTERM");
    expect(disconnectResources).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
