import secrets
import string

_ALPHABET = string.ascii_lowercase + string.digits


def generate_id(size: int = 16) -> str:
    """Short random id used as primary key default across all models."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(size))
