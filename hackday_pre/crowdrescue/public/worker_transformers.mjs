// Module web worker for optional Transformers.js integration and fallback stepify
let transformersAvailable = false;
let pipelineInstance = null;

async function tryLoadTransformers(){
  // Try local bundle first (to support offline/demo use). Then fall back to CDN.
  const localPaths = ['/lib/transformers_local.mjs', '/lib/transformers_local.js'];
  for (const p of localPaths){
    try{
      const mod = await import(p);
      if (mod && mod.pipeline){
        transformersAvailable = true;
        pipelineInstance = async (task, model, opts) => await mod.pipeline(task, model, opts);
        postMessage({ type:'status', status:'transformers_loaded_local', path: p });
        return;
      }
    }catch(e){
      // continue to next
    }
  }

  try{
    // Attempt to import Transformers.js from CDN as fallback
    const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@3.0.1/dist/transformers.min.js');
    if (mod && mod.pipeline){
      transformersAvailable = true;
      pipelineInstance = async (task, model, opts) => await mod.pipeline(task, model, opts);
      postMessage({ type: 'status', status: 'transformers_loaded_cdn' });
      return;
    }
  }catch(e){
    // final fallback - mark unavailable
    postMessage({ type:'status', status:'transformers_unavailable', error: e && e.message });
  }
}

function fallbackStepify(text, maxTasks=3){
  if (!text) return [];
  const parts = text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').split(/[。！？!?\n]+/).map(s=>s.trim()).filter(Boolean);
  const tasks = [];
  for (let i=0;i<Math.min(maxTasks, parts.length); i++){
    const p = parts[i];
    tasks.push({ id:`local-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`, title: p.slice(0,60), description: p.slice(0,300), status:'open' });
  }
  return tasks;
}

self.addEventListener('message', async (ev) => {
  const data = ev.data || {};
  if (data && data.type === 'init'){
    // try to load transformers in background
    tryLoadTransformers();
    return;
  }
  if (data && data.type === 'stepify'){
    const { text, maxTasks = 3 } = data;
    // If transformers are available and a model path is provided, try to call pipeline
    if (transformersAvailable && pipelineInstance){
      try{
        // This is a best-effort; actual pipeline & model must exist in /models/onnx_model
        const task = 'text2text-generation';
        const model = '/models/onnx_model';
        const p = await pipelineInstance(task, model, { progress_callback: null });
        // Use a simple prompt-style input; transformers.js pipelines vary by task
        const prompt = `Extract up to ${maxTasks} short action items from the following text:\n\n${text}`;
        const out = await p(prompt);
        // Normalize output to tasks if possible
        const textOut = (Array.isArray(out) ? out.map(o=>o.output||o).join('\n') : (out.output||String(out)));
        const tasks = fallbackStepify(textOut, maxTasks);
        postMessage({ type:'result', status:'ok', tasks });
        return;
      }catch(e){
        // fall through to fallback
        postMessage({ type:'status', status:'transformers_failed', error: e && e.message });
      }
    }

    // fallback rule-based stepify
    const tasks = fallbackStepify(text, maxTasks);
    postMessage({ type:'result', status:'ok', tasks });
  }
});
