const axios = require('axios');

module.exports = async function handler(req, res) {
  const { url, raw } = req.query;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'invalid url' });
  }
  try {
    const r = await axios.get(url, { timeout: 8000, responseType: 'text' });
    const text = r.data;
    if (raw === 'true') return res.status(200).send(text);
    // naive HTML->text
    const markdown = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                         .replace(/<[^>]+>/g, '')
                         .replace(/\s{2,}/g, ' ')
                         .trim();
    res.status(200).json({ markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
