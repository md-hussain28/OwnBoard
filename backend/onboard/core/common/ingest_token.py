"""Ingestion API tokens for the push-model GitHub Action.

The customer's GitHub Action authenticates to `POST /ingest` with a bearer token we issue per
repo. We only ever persist the SHA-256 of the token (never the plaintext), and show the plaintext
exactly once at creation — same posture as a GitHub PAT. The `obk_` prefix makes it self-describing
in logs, and the first few characters are stored separately so the UI can show `obk_1a2b…` for
identification without being able to reconstruct the secret.
"""

import hashlib
import secrets

TOKEN_PREFIX = "obk_"
_DISPLAY_PREFIX_LEN = 12  # e.g. "obk_1a2b3c4d" — enough to identify, not enough to use


def hash_token(raw_token: str) -> str:
    """SHA-256 hex digest of a token — the only form we persist or compare against."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_ingest_token() -> tuple[str, str, str]:
    """Mint a new token. Returns (plaintext, sha256_hash, display_prefix).

    The plaintext is returned to the caller once and never stored; persist only the hash + prefix.
    """
    raw = TOKEN_PREFIX + secrets.token_hex(24)
    return raw, hash_token(raw), raw[:_DISPLAY_PREFIX_LEN]
