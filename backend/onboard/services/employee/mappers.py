"""Pure mapping helpers between Clerk user/membership/invitation payloads and OwnBoard fields.

No DB or network access — just normalization used by employee creation, invitation reads, and the
Clerk membership sync. Kept underscore-prefixed to signal they are package-internal helpers.
"""

from typing import Any

from onboard.config.constants import (
    APP_ROLE_ADMIN,
    APP_ROLE_MEMBER,
    APP_ROLES,
    CLERK_ORG_ADMIN_ROLES,
)


def _member_display_name(
    first_name: str | None,
    last_name: str | None,
    identifier: str | None,
    username: str | None,
    user_id: str,
) -> str:
    full = " ".join(part for part in (first_name, last_name) if part).strip()
    if full:
        return full
    if identifier:
        return identifier
    if username:
        return username
    return user_id


def _normalize_app_role(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in APP_ROLES:
        return normalized
    return None


def _meta_dict(public_metadata: Any) -> dict[str, Any]:
    if isinstance(public_metadata, dict):
        return public_metadata
    return {}


def _app_role_from_membership(*, public_metadata: Any, clerk_role: str | None) -> str:
    """Resolve OwnBoard app_role on first create only.

    Preference: invitation/membership public_metadata.app_role → Clerk org:admin bootstrap → member.
    """
    meta = _meta_dict(public_metadata)
    from_meta = _normalize_app_role(meta.get("app_role"))
    if from_meta:
        return from_meta
    if clerk_role and clerk_role in CLERK_ORG_ADMIN_ROLES:
        return APP_ROLE_ADMIN
    return APP_ROLE_MEMBER


def _normalize_github_handle(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().lstrip("@")
    return cleaned or None


def _is_clerk_role_slug(value: str) -> bool:
    """True for Clerk org role slugs (org:member / org:admin) — not a job title."""
    lowered = value.strip().lower()
    return lowered.startswith("org:") or lowered in APP_ROLES


def _normalize_job_title(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split()).strip()
    if not cleaned or _is_clerk_role_slug(cleaned):
        return None
    return cleaned


def _invite_profile_from_meta(public_metadata: Any) -> dict[str, Any]:
    """Pull job title / GitHub / domain_id stored on the Clerk invitation → membership."""
    meta = _meta_dict(public_metadata)
    profile: dict[str, Any] = {}
    job_title = _normalize_job_title(meta.get("job_title") if isinstance(meta.get("job_title"), str) else None)
    if job_title is not None:
        profile["role"] = job_title
    github = _normalize_github_handle(meta.get("github_handle") if isinstance(meta.get("github_handle"), str) else None)
    if github is not None:
        profile["github_handle"] = github
    domain_id = meta.get("domain_id")
    if isinstance(domain_id, str) and domain_id.strip():
        profile["domain_id"] = domain_id.strip()
    return profile
