export interface Versioned {
  id: string;
  updated_at: number;
  dirty?: number | boolean;
}

/**
 * Last-write-wins resolution for a pulled remote row, compared on the
 * client-side edit time. Ties go to the remote copy so devices converge. The
 * losing side's edit is discarded (acceptable for single-user notes).
 */
export function resolveConflict<T extends Versioned>(local: T | null, remote: T): 'take-remote' | 'keep-local' {
  if (!local) return 'take-remote';
  return local.updated_at > remote.updated_at ? 'keep-local' : 'take-remote';
}
