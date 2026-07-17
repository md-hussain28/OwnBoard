import { OrganizationList } from "@clerk/nextjs";
import { APP_HOME } from "@/lib/routes";

/** Hide Clerk's built-in create-org button — tenants come from platform /app/admin. */
const hideCreateOrganizationAppearance = {
  elements: {
    organizationListCreateOrganizationActionButton: {
      display: "none",
    },
  },
} as const;

export default function SelectOrganizationPage() {
  return (
    <div className="mx-auto flex max-w-5xl justify-center px-6 py-10">
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl={APP_HOME}
        appearance={hideCreateOrganizationAppearance}
      />
    </div>
  );
}
