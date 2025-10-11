from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import re
import json

app = FastAPI(title='MCP AI Stepify')

class InPayload(BaseModel):
    text: str


def extract_json_from_text(s: str):
    # try to find a JSON array in the output
    m = re.search(r"(\[\s*\{[\s\S]*\}\s*\])", s)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # try to parse whole
    try:
        return json.loads(s)
    except Exception:
        return None


@app.on_event("startup")
def load_model():
    global generator
    generator = None
    try:
        # delayed import to avoid slow startup if not needed
        from transformers import pipeline
        model_name = os.environ.get('MCP_AI_MODEL', 'google/flan-t5-small')
        # prefer GPU if available
        device = 0  # assume single GPU; if CUDA unavailable transformers will fallback
        generator = pipeline('text2text-generation', model=model_name, device=device)
        print('AI model loaded:', model_name)
    except Exception as e:
        print('Failed to load AI model at startup:', e)
        generator = None


@app.post('/ai_stepify')
async def ai_stepify(payload: InPayload):
    text = (payload.text or '').strip()
    if not text:
        raise HTTPException(status_code=400, detail='no input text')

    prompt = (
        "Extract up to 6 microtasks from the following text. "
        "Return a JSON array of objects. Each object must contain: title, description, type, priority, estimatedMinutes. "
        "Types should be one of: safety, supply, guidance, photo, info, action. Priorities: high, medium, low. "
        "Keep descriptions concise. Text:\n" + text
    )

    if generator is None:
        raise HTTPException(status_code=503, detail='AI model not available')

    try:
        out = generator(prompt, max_length=512, do_sample=False)
        # pipeline returns a list of dicts with 'generated_text'
        raw = out[0]['generated_text'] if isinstance(out, list) and 'generated_text' in out[0] else str(out)
        # attempt to extract JSON
        tasks = extract_json_from_text(raw)
        if tasks is None:
            # return raw for debugging
            return { 'raw': raw }
        return { 'tasks': tasks }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'generation error: {e}')
