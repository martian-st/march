import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectDetail } from "@/components/object-detail";
import { StatusActions } from "@/components/status-actions";
import Link from "next/link";

export default async function ObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const { id } = await params;

  const object = await prisma.emailObject.findUnique({
    where: { id, userId: auth.userId },
  });

  if (!object) notFound();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="pl-[80px] pr-8 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={object.status === "LATER" ? "/later" : object.status === "ARCHIVED" ? "/archived" : "/"}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            &larr; Back
          </Link>
          <StatusActions objectId={object.id} currentStatus={object.status} />
        </div>
        <ObjectDetail object={object} />
      </main>
    </div>
  );
}
