import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmailStatus } from "@/generated/prisma/enums";
import { VALID_TRANSITIONS } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const newStatus = body.status?.toUpperCase();

  // Validate new status value
  if (!newStatus || !Object.values(EmailStatus).includes(newStatus as EmailStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be INBOX, LATER, or ARCHIVED" },
      { status: 400 }
    );
  }

  // Load current object
  const object = await prisma.emailObject.findUnique({
    where: { id, userId: auth.userId },
  });

  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate transition
  const allowedTransitions = VALID_TRANSITIONS[object.status];
  if (!allowedTransitions.includes(newStatus as EmailStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${object.status} to ${newStatus}. Allowed: ${allowedTransitions.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Update status
  const updated = await prisma.emailObject.update({
    where: { id },
    data: {
      status: newStatus as EmailStatus,
      statusChangedAt: new Date(),
    },
  });

  return NextResponse.json({ object: updated });
}
