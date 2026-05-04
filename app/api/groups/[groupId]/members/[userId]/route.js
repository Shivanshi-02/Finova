import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { removeGroupMember } from "@/lib/groups/removeGroupMember";

/**
 * DELETE /api/groups/:groupId/members/:userId
 * Removes the member from the group (does not delete the User).
 */
export async function DELETE(_request, context) {
  const { groupId, userId: memberUserId } = await context.params;

  const { userId: actorUserId } = await auth();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!groupId || !memberUserId) {
    return NextResponse.json({ error: "Missing group or user id" }, { status: 400 });
  }

  const result = await removeGroupMember({
    actorUserId,
    groupId,
    memberUserId,
  });

  if (!result.ok) {
    const status =
      result.message === "Group not found" || result.message === "Member not in this group"
        ? 404
        : result.message === "Only admins can remove members" || result.message === "Cannot remove the group creator"
          ? 403
          : 400;

    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ success: true });
}
