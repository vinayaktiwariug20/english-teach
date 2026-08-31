"""Fold approved candidates from a review file into the app.

    python tools/merge.py tools/review/sentences-20260828-141530.txt
    python tools/merge.py --rebuild      # rewrite generated.js from approved.json

Only blocks marked [x] are taken. tools/approved.json is the running record of
everything ever approved; js/generated.js is rebuilt from it each time, so this
is idempotent and nothing is ever silently overwritten.
"""

import argparse
import json
import pathlib
import sys

import _common as C


def js_string(s):
    """Single-quoted JS string. Devanagari is left as-is; the files are UTF-8."""
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def rebuild_generated(approved):
    lines = [
        "// Written by tools/merge.py from tools/approved.json - do not edit by hand.",
        "// Everything here was produced by a local model and then read and approved by",
        "// a person. Nothing reaches this file without that second step.",
        "",
        "export const EXTRA_WORDS = [",
    ]
    for w in approved["words"]:
        lines.append(
            f"  {{ cat: {js_string(w['cat'])}, en: {js_string(w['en'])}, "
            f"hi: {js_string(w['hi'])}, emoji: {js_string(w['emoji'])} }},"
        )
    lines += ["];", "", "export const EXTRA_PHRASES = ["]
    for p in approved["phrases"]:
        lines.append(
            f"  {{ en: {js_string(p['en'])}, hi: {js_string(p['hi'])}, "
            f"emoji: {js_string(p['emoji'])} }},"
        )
    lines += ["];", "", "// item id -> { en, hi }", "export const EXAMPLES = {"]
    for ident, ex in sorted(approved["examples"].items()):
        lines.append(f"  {js_string(ident)}: {{ en: {js_string(ex['en'])}, hi: {js_string(ex['hi'])} }},")
    lines += ["};", ""]

    C.GENERATED_JS.write_text("\n".join(lines), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("review", nargs="?", help="a file from tools/review/")
    ap.add_argument("--rebuild", action="store_true")
    args = ap.parse_args()

    approved = C.load_approved()

    if args.review:
        # Accept the path as typed from anywhere: cwd first, then repo root.
        given = pathlib.Path(args.review)
        for candidate in (given, C.ROOT / given, C.REVIEW_DIR / given.name):
            if candidate.exists():
                path = candidate.resolve()
                break
        else:
            sys.exit(f"no such review file: {args.review}")

        data = C.load_data()
        existing_words = {w["en"].lower() for w in data["words"]} | {
            w["en"].lower() for w in approved["words"]
        }
        existing_phrases = {p["en"].lower() for p in data["phrases"]} | {
            p["en"].lower() for p in approved["phrases"]
        }
        valid_cats = {c["id"] for c in data["categories"]}

        taken = skipped = rejected = 0
        for ok, ident, fields in C.read_review(path):
            if not ok:
                skipped += 1
                continue

            en, hi = fields.get("en", "").strip(), fields.get("hi", "").strip()
            if not en or not hi:
                print(f"  rejected {ident}: needs both en: and hi:")
                rejected += 1
                continue

            if ident.startswith("phrase/") and "emoji" in fields:
                # A new phrase (existing phrases arrive as sentence examples).
                emoji = fields.get("emoji", "").strip()
                if not emoji:
                    print(f"  rejected {ident}: no emoji chosen")
                    rejected += 1
                    continue
                if en.lower() in existing_phrases:
                    print(f"  rejected {ident}: already exists")
                    rejected += 1
                    continue
                approved["phrases"].append({"en": en, "hi": hi, "emoji": emoji})
                existing_phrases.add(en.lower())
                taken += 1

            elif "emoji" in fields:
                # A new word.
                cat = ident.split("/", 1)[0]
                emoji = fields.get("emoji", "").strip()
                if cat not in valid_cats:
                    print(f"  rejected {ident}: {cat!r} is not a topic in data.js")
                    rejected += 1
                    continue
                if not emoji:
                    print(f"  rejected {ident}: no emoji chosen")
                    rejected += 1
                    continue
                if en.lower() in existing_words:
                    print(f"  rejected {ident}: already exists")
                    rejected += 1
                    continue
                approved["words"].append({"cat": cat, "en": en, "hi": hi, "emoji": emoji})
                existing_words.add(en.lower())
                taken += 1

            else:
                # An example sentence for an item that already exists.
                approved["examples"][ident] = {"en": en, "hi": hi}
                taken += 1

        C.APPROVED_JSON.write_text(
            json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"\n{taken} approved, {skipped} left unmarked, {rejected} rejected")

    rebuild_generated(approved)
    print(
        f"js/generated.js rebuilt: {len(approved['words'])} words, "
        f"{len(approved['phrases'])} phrases, {len(approved['examples'])} examples"
    )
    print("Reload the app to see them. Bump CACHE in sw.js before publishing an update.")


if __name__ == "__main__":
    main()
