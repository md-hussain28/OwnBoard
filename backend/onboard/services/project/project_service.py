"""Projects — team/product spaces a hire is placed on (Projects PRD §1).

A project bundles: project-specific onboarding *tracks* (a member must pass every track before the
project unlocks for them — gating), dev-facing *modules* (typed, function-targeted ramp-up content that
does NOT gate), reference *context* (tech stack, links, glossary, repos), and its *members*.

Access:
- Org **admins** can manage every project and create/delete projects.
- A project's **team lead** (a member with `is_lead`) can do everything an admin can on *that* project
  (edit context, manage members/leads, author modules + function types), but nothing elsewhere.
- Plain **members** get a read-only context hub plus their own gate/module progress.

The implementation is split by concern into mixins composed here, all sharing the DAO wiring,
authorization, and response builders defined in `ProjectServiceBase`:
`crud` (project lifecycle), `repos` (repo links), `function_types` (role buckets),
`members` (roster + readiness), and `modules` (dev ramp-up content).
"""

from onboard.services.project.base import ProjectServiceBase
from onboard.services.project.crud import ProjectCrudMixin
from onboard.services.project.docs import ProjectDocsMixin
from onboard.services.project.function_types import ProjectFunctionTypeMixin
from onboard.services.project.members import ProjectMemberMixin
from onboard.services.project.modules import ProjectModuleMixin
from onboard.services.project.repos import ProjectRepoMixin


class ProjectService(
    ProjectCrudMixin,
    ProjectRepoMixin,
    ProjectFunctionTypeMixin,
    ProjectMemberMixin,
    ProjectModuleMixin,
    ProjectDocsMixin,
    ProjectServiceBase,
):
    """Facade composing the project concern mixins over the shared `ProjectServiceBase`."""
