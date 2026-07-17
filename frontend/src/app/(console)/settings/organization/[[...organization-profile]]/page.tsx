import { redirect } from "next/navigation";

/** Org profile moved to OwnBoard Team page (custom RBAC). */
export default function OrganizationSettingsRedirect() {
  redirect("/team");
}
