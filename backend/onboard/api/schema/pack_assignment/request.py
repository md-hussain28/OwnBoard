from pydantic import BaseModel, Field


class CreateAssignmentsRequest(BaseModel):
    """Doc Pack PRD §6 POST /doc-packs/{id}/assignments — manual multi-select only (§10.10)."""

    employee_ids: list[str] = Field(min_length=1)
