import { db } from "@/lib/prisma";

/**
 * Recalculate account balance strictly from transactions.
 * INCOME adds, EXPENSE subtracts.
 *
 * @param {string} accountId
 * @returns {Promise<{ balance: number }>} balance is a JS number
 */
export async function recalculateAccountBalance(accountId) {
  const transactions = await db.transaction.findMany({
    where: { accountId },
    select: { type: true, amount: true },
  });

  let balance = 0;
  for (const txn of transactions) {
    const amt =
      typeof txn.amount?.toNumber === "function"
        ? txn.amount.toNumber()
        : Number(txn.amount);

    const n = Number(amt);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid amount on transaction for account ${accountId}`);
    }

    const positiveAmt = Math.abs(n);
    if (txn.type === "INCOME") balance += positiveAmt;
    else balance -= positiveAmt;
  }

  await db.account.update({
    where: { id: accountId },
    data: { balance },
  });

  return { balance };
}

