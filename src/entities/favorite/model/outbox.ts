export const maxOutboxDeliveryAttempts = 10;

export function shouldDeadLetterOutboxEvent(attempts: number): boolean {
  return attempts >= maxOutboxDeliveryAttempts;
}

export function batchOutboxItemIds(events: ReadonlyArray<{ itemId: string }>): string[] {
  return [...new Set(events.map((event) => event.itemId))];
}
