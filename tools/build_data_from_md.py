#!/usr/bin/env python3
"""Rebuild data.json's text fields from the per-page Markdown files.

This is the reverse of the Markdown export in _work/build_site_data.py. It lets
contributors edit transcriptions/*.md (e.g. via the "Edit transcription" links
that point at GitHub) and feed those edits back into the data.json that the
viewer actually renders.

It uses the existing data.json as a skeleton -- preserving image/thumb/md paths,
spread/side, manifest links and the derived `activity` field -- and overlays the
editable text fields parsed from each page's Markdown:
page_type, location, places, people, days, loose_text, notes.

Run from anywhere:
    python site/tools/build_data_from_md.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
DATA = os.path.join(SITE, "data.json")

PRINTED_RE = re.compile(r'^\*\(printed:\s*(.*)\)\*\s*$')
QUOTE_RE = re.compile(r'^>\s?(.*)$')
NOTE_RE = re.compile(r"^\*\*Transcriber's note:\*\*\s*(.*)$")


def parse_inline_list(val):
    """Legacy inline list: [a, b, c] (lossy if a value contains a comma)."""
    val = (val or "").strip()
    if val.startswith("[") and val.endswith("]"):
        val = val[1:-1]
    return [x.strip() for x in val.split(",") if x.strip()]


def parse_frontmatter(text):
    """Return (frontmatter dict, body). Scalar keys map to strings; YAML
    block-style lists (one `- item` per line) map to lists of strings."""
    fm = {}
    if not text.startswith("---"):
        return fm, text
    end = text.find("\n---", 3)
    if end == -1:
        return fm, text
    block = text[3:end].strip("\n")
    body = text[end + 4:]

    lines = block.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("- "):
            i += 1  # stray list item without a key; skip
            continue
        if ":" not in line:
            i += 1
            continue
        k, v = line.split(":", 1)
        k, v = k.strip(), v.strip()
        if v == "":
            # collect following indented "- item" lines (block list)
            items = []
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("- "):
                items.append(lines[j].strip()[2:].strip())
                j += 1
            if items:
                fm[k] = items
                i = j
                continue
            fm[k] = ""
        else:
            fm[k] = v
        i += 1
    return fm, body


def as_list(val):
    if isinstance(val, list):
        return [x for x in (s.strip() for s in val) if x]
    return parse_inline_list(val)


def parse_md(text):
    fm, body = parse_frontmatter(text)
    page = {
        "page_type": fm.get("page_type", "") if isinstance(fm.get("page_type"), str) else "",
        "places": as_list(fm.get("places")) if fm.get("places") else [],
        "people": as_list(fm.get("people")) if fm.get("people") else [],
    }
    if isinstance(fm.get("location"), str):
        page["location"] = fm["location"]

    days, loose, notes = [], [], ""
    cur_day = None
    target = "day"  # where quote lines go: "day" or "loose"

    lines = body.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        nm = NOTE_RE.match(line)
        if nm:  # note is always last; capture the remainder verbatim
            rest = [nm.group(1)] + lines[i + 1:]
            notes = "\n".join(rest).strip()
            break

        if stripped.startswith("## "):
            head = stripped[3:].strip()
            if head == "(non-dated page)":
                target, cur_day = "loose", None
            else:
                parts = head.split("—")
                cur_day = {
                    "date": parts[0].strip(),
                    "weekday": parts[1].strip() if len(parts) > 1 else "",
                    "printed_note": "",
                    "hand_lines": [],
                }
                days.append(cur_day)
                target = "day"
            i += 1
            continue

        if stripped.startswith("### "):
            if stripped[4:].strip().lower().startswith("other writing"):
                target, cur_day = "loose", None
            i += 1
            continue

        pm = PRINTED_RE.match(stripped)
        if pm and cur_day is not None:
            cur_day["printed_note"] = pm.group(1).strip()
            i += 1
            continue

        qm = QUOTE_RE.match(line)
        if qm:
            content = qm.group(1)
            if content.strip() != "*(no writing)*":
                if target == "day" and cur_day is not None:
                    cur_day["hand_lines"].append(content)
                else:
                    loose.append(content)
            i += 1
            continue

        i += 1

    page["days"] = days
    page["loose_text"] = loose
    page["notes"] = notes
    return page


def main():
    with open(DATA, encoding="utf-8") as fh:
        data = json.load(fh)

    updated, missing = 0, []
    for b in data.get("books", []):
        for p in b.get("pages", []):
            md_rel = p.get("md")
            if not md_rel:
                continue
            md_path = os.path.join(SITE, md_rel)
            if not os.path.exists(md_path):
                missing.append(md_rel)
                continue
            with open(md_path, encoding="utf-8") as fh:
                parsed = parse_md(fh.read())
            p["page_type"] = parsed["page_type"]
            if "location" in parsed:
                p["location"] = parsed["location"]
            p["places"] = parsed["places"]
            p["people"] = parsed["people"]
            p["days"] = parsed["days"]
            p["loose_text"] = parsed["loose_text"]
            p["notes"] = parsed["notes"]
            updated += 1

    with open(DATA, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False)

    print(f"updated {updated} pages from Markdown -> {DATA}")
    if missing:
        print(f"warning: {len(missing)} page(s) had no Markdown file:")
        for m in missing[:10]:
            print(f"  - {m}")


if __name__ == "__main__":
    main()
