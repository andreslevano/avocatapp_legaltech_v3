/**
 * Vertex AI text-embedding-005 helper.
 * Uses the Firebase Admin service account credential (same creds as firebase-admin)
 * to obtain a GCP access token and call the Vertex AI Predict API.
 *
 * text-embedding-005 produces 768-dimensional vectors.
 * Use task_type='RETRIEVAL_QUERY' at query time, 'RETRIEVAL_DOCUMENT' during ingestion.
 */

import { getAdmin } from '@/lib/firebase-admin';

const PROJECT = 'avocat-legaltech-v3';
const REGION = 'us-central1';
const MODEL = 'text-embedding-005';
const VERTEX_URL =
  `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}` +
  `/locations/${REGION}/publishers/google/models/${MODEL}:predict`;

async function getAccessToken(): Promise<string> {
  const app = getAdmin();
  const credential = (app as unknown as { credential: { getAccessToken: () => Promise<{ access_token: string }> } })
    .credential;
  const token = await credential.getAccessToken();
  return token.access_token;
}

export async function generateEmbedding(
  text: string,
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const accessToken = await getAccessToken();

  const res = await fetch(VERTEX_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ task_type: taskType, content: text }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex AI embedding failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    predictions: { embeddings: { values: number[] } }[];
  };
  return data.predictions[0].embeddings.values;
}

/** Batch embed up to 250 texts in one API call. */
export async function generateEmbeddingsBatch(
  texts: string[],
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  const accessToken = await getAccessToken();

  const res = await fetch(VERTEX_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: texts.map(content => ({ task_type: taskType, content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex AI batch embedding failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    predictions: { embeddings: { values: number[] } }[];
  };
  return data.predictions.map(p => p.embeddings.values);
}
