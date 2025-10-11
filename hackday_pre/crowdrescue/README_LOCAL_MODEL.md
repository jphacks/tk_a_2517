Local model README

This project supports an optional local client-side AI flow using Transformers.js (Transformers.js/ONNX in browser). Follow these steps to prepare a demo-ready local model:

1. Choose a compact question-answering or text2text model that you can convert to ONNX. Recommended target for Japanese: mdeberta-v3-base-squad2 or other small SOTA model.

2. Convert model to ONNX using Optimum (on a machine with GPU/CPU installed):

```bash
pip install optimum[onnxruntime]
optimum-cli export onnx --model timpal0l/mdeberta-v3-base-squad2 --task question-answering ./onnx_model/
```

3. Copy the `onnx_model` directory into `public/models/onnx_model` under the crowdrescue project. The worker expects models at `/models/onnx_model`.

4. (Optional) If you want a fully offline demo without relying on CDN, prepare a local wrapper `public/lib/transformers_local.mjs` that re-exports the transformers.js `pipeline` API you need. The worker will try to import `/lib/transformers_local.mjs` first.

5. Start the app and open the participant page. Use the "ローカルAIでステップ化" button to run the local pipeline (if available). If no model or local bundle is found, the worker falls back to a rule-based stepify.

Notes
- Models can be large; ensure the demo machine has enough disk space and memory.
- Transformers.js and ONNX runtime may require WebGPU-enabled browsers for best performance.
- Always prepare models ahead of the event; do not rely on downloading during the demo.
