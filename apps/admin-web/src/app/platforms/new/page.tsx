import { redirect } from "next/navigation";

export default function NewPlatformRedirect() {
  redirect("/console/platforms/new");
}
