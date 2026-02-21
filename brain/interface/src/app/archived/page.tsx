import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectList } from "@/components/object-list";
import { CommandBar } from "@/components/command-bar";

export default async function ArchivedPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const objects = await prisma.emailObject.findMany({
    where: { userId: auth.userId, status: "ARCHIVED" },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      subject: true,
      senderName: true,
      senderEmail: true,
      receivedAt: true,
      status: true,
      bodyText: true,
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <h1 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">Archived</h1>
          <ObjectList objects={objects} status="ARCHIVED" />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
