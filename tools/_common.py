"""Shared helpers for the content pipeline: reading js/data.js, talking to a
local Ollama, and the review-file format.

Nothing here touches the network beyond 127.0.0.1.
"""

import json
import re
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "js" / "data.js"
GENERATED_JS = ROOT / "js" / "generated.js"
APPROVED_JSON = Path(__file__).resolve().parent / "approved.json"
REVIEW_DIR = Path(__file__).resolve().parent / "review"

OLLAMA = "http://127.0.0.1:11434"
DEFAULT_MODEL = "llama3.1:8b-instruct-q4_K_M"

KINDS = ("sentences", "words", "phrases")


# ---------------------------------------------------------------------------
# Reading the existing content
# ---------------------------------------------------------------------------

WORD_RE = re.compile(
    r"\{\s*cat:\s*'([^']*)',\s*en:\s*'([^']*)',\s*hi:\s*'([^']*)',"
    r"\s*(emoji|swatch|num):\s*'([^']*)'\s*\}"
)
PHRASE_RE = re.compile(r"\{\s*en:\s*'([^']*)',\s*hi:\s*'([^']*)',\s*emoji:\s*'([^']*)'\s*\}")
CATEGORY_RE = re.compile(r"\{\s*id:\s*'([^']*)',\s*en:\s*'([^']*)',\s*hi:\s*'([^']*)'")


def _section(text, start_marker):
    """Return the array literal that follows `start_marker`."""
    i = text.index(start_marker)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                return text[i : j + 1]
    raise ValueError(f"unterminated array after {start_marker!r}")


def load_data():
    """Parse js/data.js into {categories, words, phrases}.

    data.js is machine-uniform enough that a regex is honest here; if the shape
    ever drifts, the counts printed by `generate.py --check` will show it.
    """
    text = DATA_JS.read_text(encoding="utf-8")

    categories = [
        {"id": m[0], "en": m[1], "hi": m[2]}
        for m in CATEGORY_RE.findall(_section(text, "export const CATEGORIES = ["))
    ]
    words = [
        {"cat": m[0], "en": m[1], "hi": m[2], m[3]: m[4], "id": f"{m[0]}/{m[1]}"}
        for m in WORD_RE.findall(_section(text, "const BASE_WORDS = ["))
    ]
    phrases = [
        {"en": m[0], "hi": m[1], "emoji": m[2], "id": f"phrase/{m[0]}"}
        for m in PHRASE_RE.findall(_section(text, "const BASE_PHRASES = ["))
    ]
    return {"categories": categories, "words": words, "phrases": phrases}


def load_approved():
    if not APPROVED_JSON.exists():
        return {"words": [], "phrases": [], "examples": {}}
    data = json.loads(APPROVED_JSON.read_text(encoding="utf-8"))
    data.setdefault("words", [])
    data.setdefault("phrases", [])
    data.setdefault("examples", {})
    return data


# ---------------------------------------------------------------------------
# Ollama
# ---------------------------------------------------------------------------


def ollama_models():
    try:
        with urllib.request.urlopen(f"{OLLAMA}/api/tags", timeout=10) as r:
            return [m["name"] for m in json.load(r).get("models", [])]
    except (urllib.error.URLError, OSError, ValueError):
        return []


def chat(model, system, user, schema, timeout=900):
    """One structured request. Returns the parsed `items` list."""
    body = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "options": {"temperature": 0.6, "num_ctx": 4096},
        "format": schema,
    }
    req = urllib.request.Request(
        f"{OLLAMA}/api/chat",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        payload = json.load(r)

    content = payload.get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Structured output should make this unreachable, but a stray model can
        # still wrap the JSON in prose. Salvage the outermost object.
        start, end = content.find("{"), content.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"model returned no JSON:\n{content[:400]}")
        parsed = json.loads(content[start : end + 1])

    items = parsed.get("items", [])
    if not isinstance(items, list):
        raise ValueError(f"expected a list of items, got {type(items).__name__}")
    return items


def schema_for(fields):
    return {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {f: {"type": "string"} for f in fields},
                    "required": list(fields),
                },
            }
        },
        "required": ["items"],
    }


# ---------------------------------------------------------------------------
# Review file format
#
#   [ ] some/identifier
#       en:    ...
#       hi:    ...
#       gloss: ...
#
# A leading [x] means approved. Blank lines separate candidates; lines starting
# with # are comments.
# ---------------------------------------------------------------------------

HEADER = """\
# My English - review file
# kind: {kind}    model: {model}    generated: {when}
#
# Approve a candidate by putting an x in its box:   [x]
# Leave it as [ ] to skip it. Edit any line freely before approving - what you
# approve is what gets merged, not what the model wrote.
#
# EVERY Hindi line needs a human read. A small local model gets Hindi wrong in
# ways that still look fluent: wrong gender agreement, wrong postposition,
# over-formal register. The gloss is a word-by-word crib to help you check it.
# The learner cannot tell a wrong translation from a right one, so this file is
# the only thing standing between the model and what they learn.
{extra}
# Then run:  python tools/merge.py {path}

"""

BOX_RE = re.compile(r"^\[( |x|X)\]\s*(\S.*)$")
FIELD_RE = re.compile(r"^\s+(\w+):\s*(.*)$")


def write_review(path, kind, model, when, blocks, extra="", display=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    out = [HEADER.format(kind=kind, model=model, when=when,
                     path=(display or path.as_posix()), extra=extra)]
    for ident, fields in blocks:
        out.append(f"[ ] {ident}\n")
        width = max(len(k) for k in fields) + 1
        for k, v in fields.items():
            out.append(f"    {(k + ':').ljust(width)} {v}\n")
        out.append("\n")
    path.write_text("".join(out), encoding="utf-8")


def read_review(path):
    """Yield (approved, identifier, fields) for each block in a review file."""
    blocks = []
    current = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        box = BOX_RE.match(line)
        if box:
            current = (box.group(1).lower() == "x", box.group(2).strip(), {})
            blocks.append(current)
            continue
        field = FIELD_RE.match(raw)
        if field and current is not None:
            current[2][field.group(1)] = field.group(2).strip()
    return blocks
