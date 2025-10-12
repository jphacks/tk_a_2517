import kmeans from 'ml-kmeans';

// Language-agnostic TF-IDF using character trigrams
function toTrigrams(text, n = 3) {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return [s];
  const grams = [];
  for (let i = 0; i <= s.length - n; i++) {
    grams.push(s.slice(i, i + n));
  }
  return grams;
}

function buildVocab(docs) {
  const vocab = new Map();
  docs.forEach((grams) => {
    grams.forEach((g) => {
      if (!vocab.has(g)) vocab.set(g, vocab.size);
    });
  });
  return vocab;
}

function computeIdf(docs, vocab) {
  const df = new Array(vocab.size).fill(0);
  docs.forEach((grams) => {
    const seen = new Set();
    grams.forEach((g) => {
      const idx = vocab.get(g);
      if (idx != null && !seen.has(idx)) {
        df[idx] += 1;
        seen.add(idx);
      }
    });
  });
  const N = docs.length;
  return df.map((d) => Math.log((N + 1) / (d + 1)) + 1);
}

function toTfMap(grams) {
  const m = new Map();
  grams.forEach((g) => m.set(g, (m.get(g) || 0) + 1));
  const total = grams.length || 1;
  m.forEach((v, k) => m.set(k, v / total));
  return m;
}

function l2norm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  return Math.sqrt(s) || 1;
}

function tfidfVectors(docs, vocab, idf) {
  return docs.map((grams) => {
    const tf = toTfMap(grams);
    const v = new Array(vocab.size).fill(0);
    tf.forEach((val, gram) => {
      const idx = vocab.get(gram);
      if (idx != null) v[idx] = val * idf[idx];
    });
    const norm = l2norm(v);
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  });
}

export async function clusterTexts(texts, k = 3) {
  const docs = texts.map((t) => toTrigrams(String(t || '').toLowerCase()));
  const vocab = buildVocab(docs);
  const idf = computeIdf(docs, vocab);
  const vectors = tfidfVectors(docs, vocab, idf);

  const clustersResult = kmeans(vectors, Math.max(1, Math.min(k, vectors.length)));
  const { clusters } = clustersResult;
  return clusters.map((group, i) => ({ clusterId: i, items: group.map((idx) => texts[idx]) }));
}
