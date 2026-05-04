"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recalculateAccountBalance } from "@/lib/accounts/recalculateAccountBalance";

const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
  };
}

export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Backwards compatible input:
    // - bulkDeleteTransactions(["id1","id2"])
    // - bulkDeleteTransactions({ ids: ["id1"], accountId: "..." })
    const ids = Array.isArray(transactionIds)
      ? transactionIds
      : transactionIds?.ids;
    const accountId = Array.isArray(transactionIds)
      ? undefined
      : transactionIds?.accountId;

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "No transaction ids provided" };
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get transactions to calculate balance changes
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
        ...(accountId ? { accountId } : {}),
      },
    });

    console.log("[bulkDeleteTransactions] Transactions to delete:", transactions);

    if (transactions.length === 0) {
      console.error("[bulkDeleteTransactions] No matching transactions", {
        userId: user.id,
        accountId,
        idsCount: ids.length,
      });
      return { success: false, error: "No matching transactions found" };
    }

    // Group transactions by account to update balances
    // Deleting INCOME => DECREASE balance, deleting EXPENSE => INCREASE balance
    const accountBalanceChanges = {};
    for (const txn of transactions) {
      const amt =
        typeof txn.amount?.toNumber === "function"
          ? txn.amount.toNumber()
          : Number(txn.amount);

      if (!Number.isFinite(amt)) {
        console.error("[bulkDeleteTransactions] Invalid amount on txn", {
          txnId: txn.id,
          rawAmount: txn.amount,
        });
        return { success: false, error: "Invalid transaction amount" };
      }

      const positiveAmt = Math.abs(amt);

      if (!accountBalanceChanges[txn.accountId]) {
        accountBalanceChanges[txn.accountId] = 0;
      }

      // Deleting INCOME => DECREASE balance, deleting EXPENSE => INCREASE balance
      if (txn.type === "INCOME") {
        accountBalanceChanges[txn.accountId] -= positiveAmt;
      } else {
        accountBalanceChanges[txn.accountId] += positiveAmt;
      }
    }

    console.log("[bulkDeleteTransactions] Balance changes:", accountBalanceChanges);

    // Delete transactions and update account balances in a transaction
    await db.$transaction(async (tx) => {
      // Delete transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: ids },
          userId: user.id,
          ...(accountId ? { accountId } : {}),
        },
      });

      // Update account balances
      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: Number(balanceChange), // must be a number
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    if (accountId) revalidatePath(`/account/${accountId}`);

    return { success: true };
  } catch (error) {
    console.error("[bulkDeleteTransactions] Failed", error);
    return { success: false, error: error.message };
  }
}

/**
 * One-time repair utility: recompute an account's balance from transactions.
 * Safe to call if historical balance updates were wrong.
 */
export async function recalculateAccountBalanceAction(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    const result = await recalculateAccountBalance(accountId);

    revalidatePath("/dashboard");
    revalidatePath(`/account/${accountId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("[recalculateAccountBalanceAction] Failed", error);
    return { success: false, error: error.message };
  }
}

export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // First, unset any existing default account
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Then set the new default account
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
