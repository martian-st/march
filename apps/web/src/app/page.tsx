import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to signin page for unauthenticated users
  redirect("/signin");
}