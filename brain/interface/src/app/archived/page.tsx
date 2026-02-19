import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectList } from "@/components/object-list";

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
      <main className="max-w-4xl mx-auto py-4">
        <h2 className="text-lg font-semibold px-4 mb-2">Archived</h2>
        <ObjectList objects={objects} status="ARCHIVED" />
      </main>
    </div>
  );
}
