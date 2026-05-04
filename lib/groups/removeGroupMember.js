import { db } from "@/lib/prisma";

/**
 * Remove a user from a group (deletes GroupMember only). Caller must be ADMIN.
 * @param {{ actorUserId: string, groupId: string, memberUserId: string }}
 * @returns {Promise<{ ok: true } | { ok: false; message: string }>}
 */
export async function removeGroupMember({ actorUserId, groupId, memberUserId }) {
  if (memberUserId === actorUserId) {
    return { ok: false, message: "You cannot remove yourself" };
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) return { ok: false, message: "Group not found" };

  const callerMember = group.members.find((m) => m.userId === actorUserId);
  if (!callerMember || callerMember.role !== "ADMIN") {
    return { ok: false, message: "Only admins can remove members" };
  }

  const targetMember = group.members.find((m) => m.userId === memberUserId);
  if (!targetMember) return { ok: false, message: "Member not in this group" };

  if (memberUserId === group.createdBy) {
    return { ok: false, message: "Cannot remove the group creator" };
  }

  await db.groupMember.deleteMany({
    where: { groupId, userId: memberUserId },
  });

  return { ok: true };
}
