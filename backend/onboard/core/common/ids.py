"""Typed, time-ordered primary keys: `<prefix>_<uuid7-hex>` (e.g. `doc_0198f6a2...`).

UUIDv7 (RFC 9562) puts a millisecond timestamp in the high bits, so ids sort by creation
time — friendlier to Postgres b-tree indexes than fully random ids. The prefix makes any
id self-describing in logs, URLs, and API payloads (Stripe-style).
"""

import os
import time
import uuid

# `Organization.id` is the Clerk org id verbatim ("org_..."), never generated here — see root CLAUDE.md.
ID_PREFIXES = frozenset(
    {
        "ack",  # pack_assignment_ack
        "asgn",  # pack_assignment
        "attm",  # quiz_attempt
        "cchk",  # code_chunk
        "cmt",  # commit_record
        "ctrb",  # contributor
        "dchk",  # doc_chunk
        "doc",  # doc_pack_document
        "emp",  # employee
        "exav",  # expertise_availability
        "fexp",  # file_expertise
        "note",  # institutional_memory_note
        "pack",  # doc_pack
        "pol",  # policy_doc
        "ques",  # quiz_question
        "quiz",  # quiz_template
        "repo",  # repo
        "slot",  # transient quiz-generation slots (not a table)
    }
)


def uuid7() -> uuid.UUID:
    """RFC 9562 UUIDv7: 48-bit unix-ms timestamp + version/variant bits + 74 random bits."""
    timestamp_ms = time.time_ns() // 1_000_000
    raw = bytearray(timestamp_ms.to_bytes(6, "big") + os.urandom(10))
    raw[6] = (raw[6] & 0x0F) | 0x70  # version 7
    raw[8] = (raw[8] & 0x3F) | 0x80  # variant 10xx
    return uuid.UUID(bytes=bytes(raw))


def typed_id(prefix: str) -> str:
    """Generate a `<prefix>_<32-hex-uuid7>` id. Prefix must be registered in ID_PREFIXES."""
    if prefix not in ID_PREFIXES:
        raise ValueError(f"Unknown id prefix: {prefix!r} — register it in onboard.core.common.ids.ID_PREFIXES")
    return f"{prefix}_{uuid7().hex}"
