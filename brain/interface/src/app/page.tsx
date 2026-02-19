import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { NoteEditor } from "@/components/note-editor";

export default async function TodayPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <p className="text-xs text-gray-400 mb-8">{today}</p>
          <NoteEditor />
        </div>
      </main>
    </div>
  );
}
