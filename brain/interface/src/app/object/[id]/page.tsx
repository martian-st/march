import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectDetail } from "@/components/object-detail";
import { StatusActions } from "@/components/status-actions";
import { CommandBar } from "@/components/command-bar";
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
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <Link
              href={object.status === "LATER" ? "/later" : object.status === "ARCHIVED" ? "/archived" : "/inbox"}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              &larr; Back
            </Link>
            <StatusActions objectId={object.id} currentStatus={object.status} />
          </div>
          <ObjectDetail object={object} />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
