import { describe, expect, it, vi } from "vitest";

import { scheduleTrendingRefresh } from "./schedule-refresh";

describe("scheduleTrendingRefresh", () => {
  it("revalidates trending twice after the outbox projection delay", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();

    const cancel = scheduleTrendingRefresh(refresh);
    vi.advanceTimersByTime(1_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(3_000);

    expect(refresh).toHaveBeenCalledTimes(2);
    cancel();
    vi.useRealTimers();
  });

  it("cancels pending refreshes when the component unmounts", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();

    scheduleTrendingRefresh(refresh)();
    vi.runAllTimers();

    expect(refresh).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
