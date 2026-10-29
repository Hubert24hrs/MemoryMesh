// Minimal Pinecone data-plane client. Each user gets their own namespace and
// vectors carry no metadata: only the note id and the embedding are stored.

export interface Match {
  id: string;
  score: number;
}

function config() {
  const host = Deno.env.get('PINECONE_INDEX_HOST');
  const apiKey = Deno.env.get('PINECONE_API_KEY');
  if (!host || !apiKey) throw new Error('Pinecone is not configured');
  return { host: host.replace(/\/$/, ''), apiKey };
}

async function call(path: string, body: unknown): Promise<unknown> {
  const { host, apiKey } = config();
  const res = await fetch(`${host}${path}`, {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json', 'X-Pinecone-API-Version': '2025-04' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pinecone ${path} failed: HTTP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function upsertVector(namespace: string, id: string, values: number[]): Promise<void> {
  await call('/vectors/upsert', { namespace, vectors: [{ id, values }] });
}

export async function queryVectors(namespace: string, vector: number[], topK: number): Promise<Match[]> {
  const data = (await call('/query', { namespace, vector, topK, includeValues: false, includeMetadata: false })) as {
    matches?: Match[];
  };
  return (data.matches ?? []).map((m) => ({ id: m.id, score: m.score }));
}

export async function deleteVectors(namespace: string, ids: string[]): Promise<void> {
  await call('/vectors/delete', { namespace, ids });
}

export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    await call('/vectors/delete', { namespace, deleteAll: true });
  } catch (error) {
    // Pinecone returns 404 for a namespace that never had vectors.
    if (!(error instanceof Error && error.message.includes('HTTP 404'))) throw error;
  }
}
