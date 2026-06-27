export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `bb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
