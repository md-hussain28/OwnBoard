import { redirect } from "next/navigation";

/** Org profile is Clerk's modal from the sidebar switcher — no custom page. */
export default function OrganizationSettingsRedirect() {
  redirect("/");
}
