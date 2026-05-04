import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { removeGroupInvite } from "@/lib/groups/removeGroupInvite";

/**
 * DELETE /api/groups/invites/:inviteId
 * Cancels (deletes) a pending invite. Does not delete the group/user.
 */
export async function DELETE(_request, context) {
  const { inviteId } = await context.params;

  const { userId: actorUserId } = await auth();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!inviteId) {
    return NextResponse.json({ error: "Missing invite id" }, { status: 400 });
  }

  const result = await removeGroupInvite({ actorUserId, inviteId });
  if (!result.ok) {
    const status =
      result.message === "Invite not found"
        ? 404
        : result.message === "Only admins can delete invites"
          ? 403
          : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ success: true });
}

