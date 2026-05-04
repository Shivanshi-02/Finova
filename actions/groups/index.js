"use server";

/**
 * actions/groups/index.js
 * All server actions for the Groups module.
 * Isolated — import ONLY from @/actions/groups.
 */

import { db } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import {
  calculateEqualSplit,
  calculateUnequalSplit,
  calculatePercentageSplit,
  calculateBalances,
} from "@/lib/groups/splitCalculator";
import { sendGroupInviteEmail } from "@/lib/groups/email";
import { removeGroupMember as removeGroupMemberLogic } from "@/lib/groups/removeGroupMember";

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function getAuthUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Not authenticated");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  return {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
    dbUser,
  };
}

// ─── Group List ───────────────────────────────────────────────────────────────

/**
 * Get all groups the current user is a member of, with member count + net balance.
 */
export async function getUserGroups() {
  const { clerkId } = await getAuthUser();

  const memberships = await db.groupMember.findMany({
    where: { userId: clerkId },
    include: {
      group: {
        include: {
          members: true,
          expenses: { include: { splits: true } },
          settlements: true,
        },
      },
    },
  });

  return memberships.map(({ group }) => {
    const balances = calculateBalances(group.expenses, group.settlements);
    const myBalance = balances[clerkId]?.balance ?? 0;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.createdBy,
      memberCount: group.members.length,
      myBalance: parseFloat(myBalance.toFixed(2)),
    };
  });
}

// ─── Create Group ─────────────────────────────────────────────────────────────

/**
 * Create a new group, add the creator as ADMIN, and invite additional members by email.
 */
export async function createGroup({ name, description, memberEmails = [] }) {
  const { clerkId, email, name: userName } = await getAuthUser();

  const group = await db.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdBy: clerkId,
      members: {
        create: {
          userId: clerkId,
          email,
          name: userName,
          role: "ADMIN",
        },
      },
    },
    include: { members: true },
  });

  // Send invites to additional emails
  if (memberEmails.length > 0) {
    for (const inviteeEmail of memberEmails) {
      if (inviteeEmail.trim() === email) continue; // skip self
      await _createAndSendInvite({ groupId: group.id, inviteeEmail: inviteeEmail.trim(), inviterName: userName, groupName: name, invitedBy: clerkId });
    }
  }

  return { success: true, group };
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

/**
 * Get full group details including members, expenses, settlements, invites.
 */
export async function getGroupById(groupId) {
  const { clerkId } = await getAuthUser();

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      expenses: { include: { splits: true }, orderBy: { date: "desc" } },
      settlements: { orderBy: { settledAt: "desc" } },
      invites: { where: { status: "PENDING" } },
    },
  });

  if (!group) throw new Error("Group not found");

  // Check membership
  const isMember = group.members.some((m) => m.userId === clerkId);
  if (!isMember) throw new Error("You are not a member of this group");

  const balances = calculateBalances(group.expenses, group.settlements);

  return { group, balances, currentUserId: clerkId };
}

// ─── Add Expense ──────────────────────────────────────────────────────────────

/**
 * Add a group expense with split logic.
 * splitType: "EQUAL" | "UNEQUAL" | "PERCENTAGE"
 * splits: array of { userId, userName, amount?, percentage? }
 */
export async function addGroupExpense({
  groupId,
  description,
  amount,
  paidBy,
  paidByName,
  splitType = "EQUAL",
  participants, // [{ userId, userName }]
  splits = [],  // for UNEQUAL / PERCENTAGE
  date,
}) {
  const { clerkId } = await getAuthUser();

  const totalAmount = Number(amount);

  let computedSplits = [];

  if (splitType === "EQUAL") {
    computedSplits = calculateEqualSplit(totalAmount, participants);
  } else if (splitType === "UNEQUAL") {
    const result = calculateUnequalSplit(totalAmount, splits);
    if (!result.valid) return { success: false, message: result.message };
    computedSplits = result.splits;
  } else if (splitType === "PERCENTAGE") {
    const result = calculatePercentageSplit(totalAmount, splits);
    if (!result.valid) return { success: false, message: result.message };
    computedSplits = result.splits;
  }

  await db.groupExpense.create({
    data: {
      groupId,
      description: description || null,
      amount: totalAmount,
      paidBy,
      paidByName: paidByName || null,
      splitType,
      date: date ? new Date(date) : new Date(),
      splits: {
        create: computedSplits.map((s) => ({
          userId: s.userId,
          userName: s.userName || null,
          amount: s.amount,
          percentage: s.percentage ?? null,
        })),
      },
    },
  });

  return { success: true };
}

// ─── Delete Expense ───────────────────────────────────────────────────────────

export async function deleteGroupExpense(expenseId) {
  const { clerkId } = await getAuthUser();

  const expense = await db.groupExpense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });

  if (!expense) return { success: false, message: "Expense not found" };

  const isMember = expense.group.members.some((m) => m.userId === clerkId);
  if (!isMember) return { success: false, message: "Not authorized" };

  await db.groupExpense.delete({ where: { id: expenseId } });
  return { success: true };
}

// ─── Settle Up ────────────────────────────────────────────────────────────────

export async function settleUp({ groupId, toUserId, toUserName, amount, note }) {
  const { clerkId, name } = await getAuthUser();

  await db.settlement.create({
    data: {
      groupId,
      fromUserId: clerkId,
      fromUserName: name,
      toUserId,
      toUserName: toUserName || toUserId,
      amount: Number(amount),
      note: note || null,
    },
  });

  return { success: true };
}

// ─── Invite Member ────────────────────────────────────────────────────────────

export async function inviteMember({ groupId, email }) {
  const { clerkId, name: inviterName } = await getAuthUser();

  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) return { success: false, message: "Group not found" };

  // Check if already a member
  const existingMember = await db.groupMember.findFirst({
    where: { groupId, email },
  });
  if (existingMember) return { success: false, message: "Already a member" };

  return await _createAndSendInvite({
    groupId,
    inviteeEmail: email.trim(),
    inviterName,
    groupName: group.name,
    invitedBy: clerkId,
  });
}

async function _createAndSendInvite({ groupId, inviteeEmail, inviterName, groupName, invitedBy }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert invite (reset if exists and was rejected)
  let invite;
  try {
    invite = await db.groupInvite.upsert({
      where: { groupId_email: { groupId, email: inviteeEmail } },
      update: { status: "PENDING", expiresAt, invitedBy },
      create: { groupId, email: inviteeEmail, invitedBy, expiresAt },
    });
  } catch {
    return { success: false, message: "Invite already pending" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/groups/invite/${invite.token}`;

  // Use the new Resend utility
  await sendGroupInviteEmail({
    to: inviteeEmail,
    inviterName,
    groupName,
    inviteLink,
  });

  return { success: true, inviteLink, token: invite.token };
}

// ─── Accept / Reject Invite ───────────────────────────────────────────────────

export async function acceptInvite(token) {
  const { clerkId, email, name } = await getAuthUser();

  const invite = await db.groupInvite.findUnique({ where: { token } });
  if (!invite) return { success: false, message: "Invite not found" };
  if (invite.status !== "PENDING") return { success: false, message: `Invite already ${invite.status.toLowerCase()}` };
  if (new Date() > invite.expiresAt) return { success: false, message: "Invite has expired" };

  await db.$transaction([
    db.groupInvite.update({ where: { token }, data: { status: "ACCEPTED" } }),
    db.groupMember.upsert({
      where: { userId_groupId: { userId: clerkId, groupId: invite.groupId } },
      update: {},
      create: { userId: clerkId, email, name, groupId: invite.groupId },
    }),
  ]);

  return { success: true, groupId: invite.groupId };
}

export async function rejectInvite(token) {
  const invite = await db.groupInvite.findUnique({ where: { token } });
  if (!invite) return { success: false, message: "Invite not found" };

  await db.groupInvite.update({ where: { token }, data: { status: "REJECTED" } });
  return { success: true };
}

// ─── Pending Invites for current user ─────────────────────────────────────────

export async function getPendingInvites() {
  const { email } = await getAuthUser();

  const invites = await db.groupInvite.findMany({
    where: { email, status: "PENDING" },
    include: { group: { include: { members: true } } },
  });

  return invites.map((inv) => ({
    id: inv.id,
    token: inv.token,
    groupId: inv.groupId,
    groupName: inv.group.name,
    memberCount: inv.group.members.length,
    invitedBy: inv.invitedBy,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  }));
}

// ─── Remove Member ────────────────────────────────────────────────────────────

export async function removeMember({ groupId, userId }) {
  const { clerkId } = await getAuthUser();

  const result = await removeGroupMemberLogic({
    actorUserId: clerkId,
    groupId,
    memberUserId: userId,
  });

  return result.ok
    ? { success: true }
    : { success: false, message: result.message };
}
