#!/usr/bin/env python3
"""OwnBoard push-model extractor — runs inside a customer's GitHub Action.

Reads the repo's own git history (the checkout the workflow already has), derives who-built-what
metadata + code chunks, and POSTs a snapshot to OwnBoard's `/ingest` endpoint. Standard library
only — no pip install, no repo access granted to OwnBoard. Everything here runs on the customer's
runner; only the derived JSON leaves their environment.

Configured entirely via environment (set by action.yml):
  OWNBOARD_API_KEY   (required)  per-repo bearer token issued in the OwnBoard UI
  OWNBOARD_ENDPOINT  (required)  full URL, e.g. https://api.example.com/api/v1/ingest
  OWNBOARD_MAX_COMMITS (opt)     cap commit history sent (default 1000)
  OWNBOARD_PATHS       (opt)     comma-separated path prefixes to restrict code chunking
  OWNBOARD_REPO_NAME   (opt)     display name (defaults to $GITHUB_REPOSITORY)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

US = "\x1f"  # unit separator — safe field delimiter inside git --pretty formats
REC = "\x01"  # record marker prefixing each commit header in the numstat stream

CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".kt", ".rb", ".php",
    ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".swift", ".scala", ".sql", ".sh",
    ".vue", ".svelte", ".md", ".yaml", ".yml", ".toml",
}
CHUNK_LINES = 120
CHUNK_OVERLAP = 20
MAX_FILES = 1500
MAX_CHUNKS = 6000
MAX_CHUNK_CHARS = 12000


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, check=True, encoding="utf-8", errors="replace"
    ).stdout


def collect_commits(max_commits: int) -> tuple[list[dict], list[dict]]:
    """Return (contributors, commits) from `git log` (subject only, one line per commit)."""
    fmt = US.join(["%H", "%an", "%ae", "%aI", "%s"])
    out = _git("log", "--no-merges", f"--max-count={max_commits}", f"--pretty=format:{fmt}")
    commits: list[dict] = []
    contributors: dict[str, dict] = {}
    for line in out.splitlines():
        if not line:
            continue
        parts = line.split(US)
        if len(parts) < 5:
            continue
        sha, name, email, date, subject = parts[0], parts[1], parts[2], parts[3], parts[4]
        key = email or name
        contributors.setdefault(key, {"name": name or key, "email": email or None, "handle": None})
        commits.append(
            {"hash": sha, "message": subject, "author_email": key, "committed_at": date, "linked_issue": None}
        )
    return list(contributors.values()), commits


def collect_file_expertise() -> list[dict]:
    """Per (file, author) commit counts + most-recent touch, from `git log --numstat`."""
    fmt = REC + US.join(["%ae", "%aI"])
    out = _git("log", "--no-merges", "--numstat", f"--pretty=format:{fmt}")
    agg: dict[tuple[str, str], dict] = {}
    cur_email = ""
    cur_date = ""
    for line in out.splitlines():
        if line.startswith(REC):
            _, _, rest = line.partition(REC)
            cur_email, _, cur_date = rest.partition(US)
            continue
        if not line.strip():
            continue
        cols = line.split("\t")
        if len(cols) != 3:
            continue
        adds, _dels, path = cols
        if adds == "-":  # binary file
            continue
        key = (path, cur_email)
        entry = agg.get(key)
        if entry is None:
            agg[key] = {
                "file_path": path,
                "author_email": cur_email,
                "commit_count": 1,
                "review_count": 0,
                "revert_count": 0,
                "last_commit_at": cur_date,
            }
        else:
            entry["commit_count"] += 1
            if cur_date > entry["last_commit_at"]:
                entry["last_commit_at"] = cur_date
    return list(agg.values())


def _path_allowed(path: str, prefixes: list[str]) -> bool:
    if os.path.splitext(path)[1] not in CODE_EXTENSIONS:
        return False
    return not prefixes or any(path.startswith(p) for p in prefixes)


def collect_code_chunks(prefixes: list[str]) -> list[dict]:
    """Fixed line-window chunks over tracked source files (bounded)."""
    tracked = [p for p in _git("ls-files").splitlines() if p]
    chunks: list[dict] = []
    files_used = 0
    for path in tracked:
        if files_used >= MAX_FILES or len(chunks) >= MAX_CHUNKS:
            break
        if not _path_allowed(path, prefixes):
            continue
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.read().splitlines()
        except OSError:
            continue
        if not any(line.strip() for line in lines):
            continue
        files_used += 1
        step = CHUNK_LINES - CHUNK_OVERLAP
        for start in range(0, len(lines), step):
            window = lines[start : start + CHUNK_LINES]
            content = "\n".join(window).strip()
            if not content:
                continue
            chunks.append(
                {
                    "file_path": path,
                    "content": content[:MAX_CHUNK_CHARS],
                    "start_line": start + 1,
                    "end_line": min(start + CHUNK_LINES, len(lines)),
                }
            )
            if len(chunks) >= MAX_CHUNKS:
                break
    return chunks


def post(endpoint: str, api_key: str, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            print("OwnBoard ingest OK:", response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        sys.exit(f"OwnBoard ingest failed ({exc.code}): {detail}")
    except urllib.error.URLError as exc:
        sys.exit(f"OwnBoard ingest could not reach {endpoint}: {exc.reason}")


def main() -> None:
    api_key = os.environ.get("OWNBOARD_API_KEY", "").strip()
    endpoint = os.environ.get("OWNBOARD_ENDPOINT", "").strip()
    if not api_key or not endpoint:
        sys.exit("OWNBOARD_API_KEY and OWNBOARD_ENDPOINT are required")
    host = urllib.parse.urlsplit(endpoint).hostname or ""
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        sys.exit(
            f"OWNBOARD_ENDPOINT is {endpoint}, but a GitHub-hosted runner cannot reach your "
            "localhost. Set `endpoint` in the workflow to your public OwnBoard API URL, e.g. "
            "https://your-api.onrender.com/api/v1/ingest"
        )

    max_commits = int(os.environ.get("OWNBOARD_MAX_COMMITS", "1000") or "1000")
    prefixes = [p.strip() for p in os.environ.get("OWNBOARD_PATHS", "").split(",") if p.strip()]
    repo_name = os.environ.get("OWNBOARD_REPO_NAME") or os.environ.get("GITHUB_REPOSITORY", "repo")

    try:
        default_branch = _git("rev-parse", "--abbrev-ref", "HEAD").strip()
        head_sha = _git("rev-parse", "HEAD").strip()
    except subprocess.CalledProcessError:
        sys.exit("Not a git checkout — the workflow must run actions/checkout with fetch-depth: 0")

    contributors, commits = collect_commits(max_commits)
    file_expertise = collect_file_expertise()
    code_chunks = collect_code_chunks(prefixes)

    payload = {
        "repo": {"name": repo_name, "default_branch": default_branch, "head_sha": head_sha},
        "contributors": contributors,
        "commits": commits,
        "file_expertise": file_expertise,
        "code_chunks": code_chunks,
    }
    print(
        f"OwnBoard: {len(contributors)} contributors, {len(commits)} commits, "
        f"{len(file_expertise)} file-expertise rows, {len(code_chunks)} code chunks → {endpoint}"
    )
    post(endpoint, api_key, payload)


if __name__ == "__main__":
    main()
