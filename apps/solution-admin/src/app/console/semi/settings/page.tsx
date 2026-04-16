import { redirect } from "next/navigation";

export default function SolutionAdminSemiSettingsRedirect() {
  redirect("/console/users");
}
