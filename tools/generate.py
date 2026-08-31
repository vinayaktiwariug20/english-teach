"""Draft new content with a local model, for a human to review.

    python tools/generate.py sentences --topic food --limit 12
    python tools/generate.py words     --topic kitchen --limit 15
    python tools/generate.py phrases   --limit 12
    python tools/generate.py --check

Writes a review file to tools/review/. Nothing reaches the app until you mark
lines approved and run tools/merge.py.
"""

import argparse
import datetime as dt
import sys
import textwrap

import _common as C

# The register matters more than anything else in these prompts. A model left to
# itself writes textbook/literary Hindi, which is not what the learner hears
# at home.
SYSTEM = textwrap.dedent(
    """\
    You help build a Hindi-to-English learning app for an adult beginner with a
    learning disability. He reads Devanagari and speaks everyday spoken Hindi.

    Rules, all of them important:
    - Hindi must be everyday SPOKEN Hindi in Devanagari script, the way family
      talk at home. Never Sanskritised, literary or news Hindi. Never romanised.
    - Keep it short and concrete. Simple present tense. No idioms, no wordplay,
      no abstractions.
    - English must be simple enough for a beginner: short words, short sentences.
    - "gloss" is a word-by-word literal English rendering of YOUR Hindi, in Hindi
      word order, so a reviewer can check the Hindi without being a translator.
      Example: for "मुझे पानी चाहिए।" the gloss is "to-me water needed".
    - Never repeat an item you were told already exists.
    - Output only the requested JSON. No commentary.
    """
)


def gen_sentences(model, data, topic, limit):
    words = [w for w in data["words"] if w.get("emoji")]
    if topic:
        words = [w for w in words if w["cat"] == topic]
    if not words:
        sys.exit(f"no words with pictures in topic {topic!r}")
    words = words[:limit]

    blocks = []
    for chunk in [words[i : i + 6] for i in range(0, len(words), 6)]:
        listing = "\n".join(f'- {w["en"]} ({w["hi"]})' for w in chunk)
        user = (
            "Write ONE very short example sentence for each of these words. "
            "The sentence must contain the word itself and describe something "
            "ordinary and picturable.\n\n"
            f"{listing}\n\n"
            'Return {"items": [{"word": "<the English word>", "en": "...", '
            '"hi": "...", "gloss": "..."}]} with one entry per word.'
        )
        print(f"  ... {', '.join(w['en'] for w in chunk)}", flush=True)
        items = C.chat(model, SYSTEM, user, C.schema_for(["word", "en", "hi", "gloss"]))

        by_word = {w["en"].lower(): w for w in chunk}
        for it in items:
            w = by_word.get(str(it.get("word", "")).strip().lower())
            if not w:
                continue
            blocks.append(
                (w["id"], {"en": it.get("en", ""), "hi": it.get("hi", ""), "gloss": it.get("gloss", "")})
            )
    return blocks, ""


def gen_words(model, data, topic, limit):
    if not topic:
        sys.exit("words needs --topic (either an existing topic id or a free description)")
    known = [w["en"] for w in data["words"]]
    cat_ids = {c["id"] for c in data["categories"]}
    cat = topic if topic in cat_ids else "home"

    user = (
        f"Suggest {limit} more everyday words for the topic: {topic}.\n"
        "They must be concrete nouns or simple actions that can be shown as a "
        "single picture, and useful in daily life in India.\n\n"
        f"These already exist, do not repeat them: {', '.join(known)}\n\n"
        'Return {"items": [{"en": "...", "hi": "...", "gloss": "..."}]}.'
    )
    print(f"  ... {limit} words for {topic!r}", flush=True)
    items = C.chat(model, SYSTEM, user, C.schema_for(["en", "hi", "gloss"]))

    seen = {w.lower() for w in known}
    blocks = []
    for it in items:
        en = str(it.get("en", "")).strip().lower()
        if not en or en in seen:
            continue
        seen.add(en)
        blocks.append(
            (
                f"{cat}/{en}",
                {"en": en, "hi": it.get("hi", ""), "emoji": "", "gloss": it.get("gloss", "")},
            )
        )
    extra = (
        "#\n"
        "# Each word needs an emoji you choose yourself - the model is bad at this.\n"
        "# Pick one from Emoji 13 or earlier, or Windows 10 shows an empty box, and\n"
        "# never one that is really letters (SOS, ABC). A word with an empty emoji:\n"
        "# line is skipped by merge.py even if approved.\n"
    )
    return blocks, extra


def gen_phrases(model, data, limit):
    known = [p["en"] for p in data["phrases"]]
    user = (
        f"Suggest {limit} more short everyday phrases someone would actually say "
        "or need out loud: asking for something, saying how they feel, being "
        "polite, getting help.\n\n"
        f"These already exist, do not repeat them: {' | '.join(known)}\n\n"
        'Return {"items": [{"en": "...", "hi": "...", "gloss": "..."}]}.'
    )
    print(f"  ... {limit} phrases", flush=True)
    items = C.chat(model, SYSTEM, user, C.schema_for(["en", "hi", "gloss"]))

    seen = {p.lower() for p in known}
    blocks = []
    for it in items:
        en = str(it.get("en", "")).strip()
        if not en or en.lower() in seen:
            continue
        seen.add(en.lower())
        blocks.append(
            (
                f"phrase/{en}",
                {"en": en, "hi": it.get("hi", ""), "emoji": "", "gloss": it.get("gloss", "")},
            )
        )
    extra = (
        "#\n"
        "# Each phrase needs an emoji you choose yourself. A phrase with an empty\n"
        "# emoji: line is skipped by merge.py even if approved.\n"
    )
    return blocks, extra


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("kind", nargs="?", choices=C.KINDS)
    ap.add_argument("--topic", help="a topic id (food, animals, ...) or, for words, any description")
    ap.add_argument("--limit", type=int, default=12)
    ap.add_argument("--model", default=C.DEFAULT_MODEL)
    ap.add_argument("--check", action="store_true", help="report what is installed and parsed, then exit")
    args = ap.parse_args()

    data = C.load_data()
    models = C.ollama_models()

    if args.check or not args.kind:
        print(f"data.js       {len(data['words'])} words, {len(data['phrases'])} phrases, "
              f"{len(data['categories'])} topics")
        print(f"topics        {', '.join(c['id'] for c in data['categories'])}")
        approved = C.load_approved()
        print(f"approved.json {len(approved['words'])} words, {len(approved['phrases'])} phrases, "
              f"{len(approved['examples'])} examples")
        if models:
            print("ollama        " + ", ".join(models))
        else:
            print("ollama        not reachable at 127.0.0.1:11434 - is Ollama running?")
        if not args.kind:
            print("\nNothing to do. Pass a kind: " + ", ".join(C.KINDS))
        return

    if not models:
        sys.exit("Ollama is not reachable at 127.0.0.1:11434. Start it and try again.")
    if args.model not in models:
        sys.exit(f"model {args.model!r} is not installed.\nInstalled: {', '.join(models)}\n"
                 f"Pull one with:  ollama pull {args.model}")

    print(f"model {args.model} - this will be slow on a 4 GB card, that is expected")

    if args.kind == "sentences":
        blocks, extra = gen_sentences(args.model, data, args.topic, args.limit)
    elif args.kind == "words":
        blocks, extra = gen_words(args.model, data, args.topic, args.limit)
    else:
        blocks, extra = gen_phrases(args.model, data, args.limit)

    if not blocks:
        sys.exit("the model returned nothing usable - try again, or a different model")

    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = C.REVIEW_DIR / f"{args.kind}-{stamp}.txt"
    rel = path.relative_to(C.ROOT).as_posix()
    C.write_review(path, args.kind, args.model, stamp, blocks, extra, display=rel)

    print(f"\n{len(blocks)} candidates written to {path.relative_to(C.ROOT)}")
    print("Read every Hindi line, mark the good ones [x], then run:")
    print(f"  python tools/merge.py {rel}")


if __name__ == "__main__":
    main()
