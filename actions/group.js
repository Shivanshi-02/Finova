"use server";

import { db } from "@/lib/prisma";

export async function createGroup(name, userId) {
  return await db.group.create({
    data: {
      name,
      createdBy: userId,
      members: {
        create: [
          { userId }, // creator automatically member
          { userId: "test_user_2" } //fake second user
        ],
      },
    },
  });
}

export async function getUserGroups(userId) {
  return await db.group.findMany({
    where: {
      createdBy: userId,
    },
  });
}

export async function getGroupById(groupId) {
  return await db.group.findUnique({
    where: {
      id: groupId,
    },
  });
}




export async function addGroupExpense({
  groupId,
  amount,
  paidBy,
  members,
  description,
}) {
  const splitAmount = amount / members.length;

  return await db.groupTransaction.create({
    data: {
      groupId,
      amount,
      paidBy,
      description,
      splits: {
        create: members.map((userId) => ({
          userId,
          amount: splitAmount,
        })),
      },
    },
  });
}

export async function deleteGroupExpense(transactionId) {
  return await db.groupTransaction.delete({
    where: {
      id: transactionId,
    },
  });
}

export async function getGroupExpenses(groupId) {
  return await db.groupTransaction.findMany({
    where: { groupId },
     include: {
      splits: true, //  IMPORTANT
    },
  });
}

//fetch members
export async function getGroupMembers(groupId) {
    
  return await db.groupMember.findMany({
    where: { groupId },
  });
}