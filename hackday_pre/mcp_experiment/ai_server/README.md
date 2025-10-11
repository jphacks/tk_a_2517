AI server for MCP experiment

This is a minimal FastAPI service that uses Hugging Face transformers to turn free text into structured microtasks.

Requirements
- Python 3.10+
- Install packages from requirements.txt
- GPU: optional but recommended for speed. Ensure appropriate torch build for your CUDA driver.

Run locally

# create venv
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# run (uses default model google/flan-t5-small; change MCP_AI_MODEL env var to switch)
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1

Notes
- If you want GPU, ensure torch with CUDA is installed (pip install torch --index-url https://download.pytorch.org/whl/cu117 etc.).
- Model download may be large and take time on first start.
