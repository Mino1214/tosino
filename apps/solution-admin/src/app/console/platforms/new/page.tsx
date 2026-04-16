import { redirect } from "next/navigation";

export default function ConsoleNewPlatformRedirect() {
  redirect("/console/users");
}
