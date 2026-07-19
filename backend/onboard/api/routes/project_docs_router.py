"""Project Docs — the reference knowledge base (uploaded, typed documents that feed 'Ask project').

Kept in its own router because uploads are multipart + scheduled through FastAPI BackgroundTasks,
mirroring the doc-pack document upload flow. All routes are project-scoped (admin OR the project's lead
for writes; any member for reads), enforced inside the service."""

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from onboard.api.dependency.auth import ClerkUserId
from onboard.api.dependency.rbac import CurrentEmployee
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.doc_pack.request import RegisterUploadsRequest, SignedUploadRequest
from onboard.api.schema.doc_pack.response import SignedUploadTargetResponse, SignedUploadUrlsResponse
from onboard.api.schema.project.request import DocTypeCreateRequest, SetDocReposRequest, SetDocTypesRequest
from onboard.api.schema.project.response import ProjectDocsResponse, ProjectDocTypeResponse
from onboard.services.doc_pack.doc_pack_service import ingest_document_background

router = APIRouter(prefix="/projects", tags=["project-docs"])


@router.get("/{project_id}/docs", response_model=ProjectDocsResponse)
async def get_project_docs(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """The project's reference docs + custom types. Each document carries its ingest status."""
    return await services.project.get_docs(org_id, project_id, employee)


@router.post("/{project_id}/docs", response_model=ProjectDocsResponse, status_code=201)
async def upload_project_docs(
    project_id: str,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    employee: CurrentEmployee,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    services: ServiceContainer = Depends(get_service_container),
):
    """Upload reference files; text is extracted, chunked + embedded in the background for Ask."""
    payloads: list[tuple[str, bytes, str | None]] = []
    for upload in files:
        content = await upload.read()
        payloads.append((upload.filename or "untitled.pdf", content, upload.content_type))
    documents = await services.project.upload_docs(org_id, project_id, employee, payloads, created_by=user_id)
    for document in documents:
        background_tasks.add_task(ingest_document_background, org_id, document.id)
    return await services.project.get_docs(org_id, project_id, employee)


@router.post("/{project_id}/docs/upload-urls", response_model=SignedUploadUrlsResponse)
async def create_project_doc_upload_urls(
    project_id: str,
    payload: SignedUploadRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Direct-to-storage upload step 1 for project reference docs — file bytes go browser → Supabase,
    bypassing the Vercel serverless request-body cap. Validates PDF-only / ≤20MB before issuing URLs."""
    targets = await services.project.create_doc_upload_urls(
        org_id, project_id, employee, [(f.filename, f.content_type, f.size) for f in payload.files]
    )
    return SignedUploadUrlsResponse(uploads=[SignedUploadTargetResponse(**t) for t in targets])


@router.post("/{project_id}/docs/register", response_model=ProjectDocsResponse, status_code=201)
async def register_project_docs(
    project_id: str,
    payload: RegisterUploadsRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    employee: CurrentEmployee,
    background_tasks: BackgroundTasks,
    services: ServiceContainer = Depends(get_service_container),
):
    """Step 2: register the uploaded objects, schedule background ingest, and return the refreshed docs."""
    documents = await services.project.register_uploaded_docs(
        org_id,
        project_id,
        employee,
        [(f.document_id, f.filename, f.storage_path, f.size) for f in payload.files],
        created_by=user_id,
        type_ids=payload.type_ids,
        repo_ids=payload.repo_ids,
        description=payload.description,
    )
    for document in documents:
        background_tasks.add_task(ingest_document_background, org_id, document.id)
    return await services.project.get_docs(org_id, project_id, employee)


@router.delete("/{project_id}/docs/{document_id}", status_code=204)
async def delete_project_doc(
    project_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.delete_doc(org_id, project_id, employee, document_id)


@router.put("/{project_id}/docs/{document_id}/types", response_model=ProjectDocsResponse)
async def set_project_doc_types(
    project_id: str,
    document_id: str,
    payload: SetDocTypesRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Set a document's type tags (many-to-many) to exactly the given project doc-type ids."""
    return await services.project.set_document_types(org_id, project_id, employee, document_id, payload.type_ids)


@router.put("/{project_id}/docs/{document_id}/repos", response_model=ProjectDocsResponse)
async def set_project_doc_repos(
    project_id: str,
    document_id: str,
    payload: SetDocReposRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Attach a document to exactly the given repos (must be repos linked to this project)."""
    return await services.project.set_document_repos(org_id, project_id, employee, document_id, payload.repo_ids)


@router.post("/{project_id}/doc-types", response_model=ProjectDocTypeResponse, status_code=201)
async def create_project_doc_type(
    project_id: str,
    payload: DocTypeCreateRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.create_doc_type(
        org_id, project_id, employee, payload.name, sort_order=payload.sort_order
    )


@router.delete("/{project_id}/doc-types/{doc_type_id}", status_code=204)
async def delete_project_doc_type(
    project_id: str,
    doc_type_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.delete_doc_type(org_id, project_id, employee, doc_type_id)
