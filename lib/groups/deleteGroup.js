import { db } from "@/lib/prisma";

/**
 * Delete a group and cascade related records. Caller must be ADMIN.
 * @param {{ actorUserId: string, groupId: string }} params
 * @returns {Promise<{ ok: true } | { ok: false; message: string }>}
 */
export async function deleteGroup({ actorUserId, groupId }) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) return { ok: false, message: "Group not found" };

  const callerMember = group.members.find((m) => m.userId === actorUserId);
  if (!callerMember || callerMember.role !== "ADMIN") {
    return { ok: false, message: "Only admins can delete groups" };
  }

  await db.group.delete({ where: { id: groupId } });
  return { ok: true };
}

