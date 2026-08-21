class DatabaseSemaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      if (this.active < this.limit) { this.active += 1; resolve(); return; }
      this.waiters.push(() => { this.active += 1; resolve(); });
    });
    try { return await operation(); }
    finally { this.active -= 1; this.waiters.shift()?.(); }
  }
}

export const cacheMissDatabaseSemaphore = new DatabaseSemaphore(25);
