function processText(text) {
  const raw = (text || '').replace(/\r/g, '').trim();
  const t = raw.replace(/\n+/g, '\n').trim();
  if (!t) return [];

  // split into candidate sentences (keep Japanese/English punctuation)
  const parts = t.split(/\n|[。\.\!\?！？]/).map(s => s.trim()).filter(Boolean);

  // heuristics / keyword sets for simple classification
  const KW = {
    safety: ['避難', '救急', 'けが', '危険', '火災', '怪我', '救助', '救護', '緊急', '急病'],
    supply: ['備品', '消耗', '在庫', '数える', '数', '部数', 'ペン', '電池', '充電'],
    guidance: ['案内', '誘導', '誘導する', '道案内', '入口', '出口', '受付', '案内所'],
    photo: ['写真', '撮る', '撮影', 'camera', 'photo'],
    info: ['情報', '確認', 'チェック', '確認する']
  };

  function containsAny(s, list){
    const lowered = s.toLowerCase();
    return list.some(k => lowered.indexOf(k) !== -1);
  }

  function detectType(s){
    if (containsAny(s, KW.safety)) return 'safety';
    if (containsAny(s, KW.supply)) return 'supply';
    if (containsAny(s, KW.guidance)) return 'guidance';
    if (containsAny(s, KW.photo)) return 'photo';
    if (containsAny(s, KW.info)) return 'info';
    return 'action';
  }

  function detectPriority(s, type){
    // safety or urgent words -> high
    if (type === 'safety') return 'high';
    if (/緊急|至急|早急|急いで|urgent|asap/i.test(s)) return 'high';
    if (type === 'supply') return 'medium';
    if (type === 'guidance') return 'medium';
    return 'low';
  }

  function extractNumbers(s){
    const m = s.match(/(\d+)(?:人|名|件|個)?/g);
    return m || [];
  }

  function extractContacts(s){
    const phones = (s.match(/0\d[-\d]{6,}/g) || []).map(x=>x);
    const emails = (s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(x=>x);
    return { phones, emails };
  }

  // produce tasks, limit results and dedupe similar sentences
  const seen = new Set();
  const tasks = [];
  let idCounter = 1;
  for (const p of parts){
    if (!p) continue;
    const key = p.slice(0,80).replace(/\s+/g,' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const type = detectType(p);
    const priority = detectPriority(p, type);
    const numbers = extractNumbers(p);
    const contacts = extractContacts(p);

    const title = p.length > 60 ? p.slice(0,57) + '...' : p;
    const description = p + (numbers.length ? '\n\n関連数値: ' + numbers.join(', ') : '') + (contacts.phones.length || contacts.emails.length ? '\n\n連絡先: ' + contacts.phones.concat(contacts.emails).join(', ') : '');

    const estimatedMinutes = type === 'safety' ? 5 : (type === 'supply' ? 10 : (type === 'photo' ? 3 : 8));

    tasks.push({
      id: `t${idCounter++}`,
      title,
      description,
      type,
      priority,
      checklist: type === 'safety' ? ['安全確保','連絡','完了報告'] : ['実行する','完了報告'],
      estimatedMinutes,
      status: 'open'
    });

    if (tasks.length >= 6) break;
  }

  // If nothing parsed into tasks, fallback to short split
  if (tasks.length === 0){
    return parts.slice(0,3).map((p,i)=>({ id:`t${i+1}`, title: p.slice(0,120), description: p, type:'action', priority:'low', checklist:['実行する','完了報告'], estimatedMinutes:5, status:'open' }));
  }

  return tasks;
}

module.exports = async function handler(req, res) {
  const body = req.method === 'POST' ? req.body : req.query;
  const text = body.text || '';
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'no input text' });
  }
  const tasks = processText(text);
  res.status(200).json({ tasks });
};

module.exports.processText = processText;
