// Tiny pub/sub so React Query can refetch after local writes (from the UI,
// AI jobs or sync) without the data layer depending on React.

type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDataChanged(): void {
  for (const listener of listeners) listener();
}
