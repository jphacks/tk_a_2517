// Simple test harness to call the local /api/verify route
import fetch from 'node-fetch';

async function run(){
  const url = 'http://localhost:3000/api/verify';
  const payload = {
    prompt: 'Summarize the following in one line: The quick brown fox jumps over the lazy dog.',
    expected: 'quick brown fox'
  };

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await resp.json();
  console.log('verify result:', data);
}

run().catch(e => { console.error(e); process.exit(1); });
