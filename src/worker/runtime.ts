type WorkerRuntimeDependencies = {
  probeDependencies: () => Promise<void>;
  registerSchedulers: () => Promise<void>;
  refreshHeartbeat: () => Promise<void>;
  closeResources: () => Promise<void>;
  disconnectResources: () => Promise<void>;
  exit: (code: number) => void;
  timeoutMs?: number;
};

export function createWorkerRuntime(dependencies: WorkerRuntimeDependencies) {
  const timeoutMs = dependencies.timeoutMs ?? 55_000;
  return {
    async recoverSchedulers() {
      await dependencies.probeDependencies();
      await dependencies.registerSchedulers();
      await dependencies.refreshHeartbeat();
    },
    async shutdown(signal: string) {
      let timedOut = false;
      await Promise.race([
        dependencies.closeResources(),
        new Promise<void>((resolve) => setTimeout(() => { timedOut = true; resolve(); }, timeoutMs)),
      ]);
      if (timedOut) {
        console.error("worker.shutdown.timeout", { signal, timeoutMs });
        await dependencies.disconnectResources();
        dependencies.exit(1);
        return;
      }
      console.info("worker.shutdown.completed", { signal });
      dependencies.exit(0);
    },
  };
}
