import { fetchJSON } from './fetchJSON';

export async function queryRag({ spot_id, userLang = 'ja' }) {
  return fetchJSON('/api/rag-query', {
    method: 'POST',
    body: JSON.stringify({ spot_id, userLang }),
  });
}
