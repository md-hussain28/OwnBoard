import { OrganizationList } from "@clerk/nextjs";

/** Hide Clerk's built-in create-org button — tenants come from platform /admin. */
const hideCreateOrganizationAppearance = {
  elements: {
    organizationListCreateOrganizationActionButton: {
      display: "none",
    },
  },
} as const;

export default function SelectOrganizationPage() {
  return (
    <div className="flex justify-center py-8">
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/"
        appearance={hideCreateOrganizationAppearance}
      />
    </div>
  );
}
