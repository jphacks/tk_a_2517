const stepify = require('../mcp/stepify');
const input = process.argv.slice(2).join(' ') || '写真を撮る。来場者を誘導する。忘れ物を数える。怪我人がいる。';
const tasks = stepify.processText(input);
console.log(JSON.stringify({ input, tasks }, null, 2));
