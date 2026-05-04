import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteGroup } from "@/lib/groups/deleteGroup";

/**
 * DELETE /api/groups/:groupId
 * Deletes the group (cascades related records via Prisma relations).
 */
export async function DELETE(_request, context) {
  const { groupId } = await context.params;

  const { userId: actorUserId } = await auth();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const result = await deleteGroup({ actorUserId, groupId });
  if (!result.ok) {
    const status =
      result.message === "Group not found"
        ? 404
        : result.message === "Only admins can delete groups"
          ? 403
          : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ success: true });
}

