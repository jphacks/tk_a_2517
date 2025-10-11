// Placeholder local transformers shim for demos.
// If you have a real transformers.js bundle adapted for browser, expose a `pipeline` function here.

export async function pipeline(task, model, opts){
  // This shim returns a dummy function that echoes back a simple transformation.
  return async function(prompt){
    // Simulate smaller output
    return { output: '（ローカルダミー）' + (typeof prompt === 'string' ? prompt.slice(0,200) : JSON.stringify(prompt).slice(0,200)) };
  };
}
