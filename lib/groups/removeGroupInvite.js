import { db } from "@/lib/prisma";

/**
 * Delete (cancel) a pending invite for a group. Caller must be ADMIN.
 * @param {{ actorUserId: string, inviteId: string }} params
 * @returns {Promise<{ ok: true } | { ok: false; message: string }>}
 */
export async function removeGroupInvite({ actorUserId, inviteId }) {
  const invite = await db.groupInvite.findUnique({
    where: { id: inviteId },
    include: { group: { include: { members: true } } },
  });

  if (!invite) return { ok: false, message: "Invite not found" };
  if (invite.status !== "PENDING") {
    return { ok: false, message: "Invite is not pending" };
  }

  const callerMember = invite.group.members.find((m) => m.userId === actorUserId);
  if (!callerMember || callerMember.role !== "ADMIN") {
    return { ok: false, message: "Only admins can delete invites" };
  }

  await db.groupInvite.delete({ where: { id: inviteId } });
  return { ok: true };
}

