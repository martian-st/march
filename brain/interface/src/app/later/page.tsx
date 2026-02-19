import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectList } from "@/components/object-list";

export default async function LaterPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const objects = await prisma.emailObject.findMany({
    where: { userId: auth.userId, status: "LATER" },
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
      <main className="pl-[80px] pr-8 py-10 max-w-3xl">
        <h1 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">Later</h1>
        <ObjectList objects={objects} status="LATER" />
      </main>
    </div>
  );
}
