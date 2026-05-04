/**
 * lib/groups/splitCalculator.js
 * Pure functions for split calculations — no side effects, fully testable.
 */

/**
 * Equal split: divide amount evenly among all participants.
 * @param {number} amount
 * @param {Array<{userId: string, userName?: string}>} participants
 * @returns {Array<{userId, userName, amount, percentage}>}
 */
export function calculateEqualSplit(amount, participants) {
  const perPerson = parseFloat((amount / participants.length).toFixed(2));
  // distribute rounding difference to first person
  const remainder = parseFloat(
    (amount - perPerson * participants.length).toFixed(2)
  );

  return participants.map((p, i) => ({
    userId: p.userId,
    userName: p.userName || p.userId,
    amount: i === 0 ? perPerson + remainder : perPerson,
    percentage: parseFloat((100 / participants.length).toFixed(2)),
  }));
}

/**
 * Unequal split: use the amounts the caller specifies.
 * Validates that the sum matches the total amount.
 * @param {number} totalAmount
 * @param {Array<{userId, userName, amount}>} splits
 * @returns {{ valid: boolean, message?: string, splits: Array }}
 */
export function calculateUnequalSplit(totalAmount, splits) {
  const sum = splits.reduce((acc, s) => acc + Number(s.amount), 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    return {
      valid: false,
      message: `Split amounts (₹${sum.toFixed(2)}) don't match total (₹${totalAmount.toFixed(2)})`,
      splits: [],
    };
  }
  return {
    valid: true,
    splits: splits.map((s) => ({
      userId: s.userId,
      userName: s.userName || s.userId,
      amount: Number(s.amount),
      percentage: parseFloat(((s.amount / totalAmount) * 100).toFixed(2)),
    })),
  };
}

/**
 * Percentage split: convert percentages to amounts.
 * Validates that percentages sum to 100.
 * @param {number} totalAmount
 * @param {Array<{userId, userName, percentage}>} splits
 * @returns {{ valid: boolean, message?: string, splits: Array }}
 */
export function calculatePercentageSplit(totalAmount, splits) {
  const sumPct = splits.reduce((acc, s) => acc + Number(s.percentage), 0);
  if (Math.abs(sumPct - 100) > 0.01) {
    return {
      valid: false,
      message: `Percentages sum to ${sumPct.toFixed(2)}% instead of 100%`,
      splits: [],
    };
  }
  return {
    valid: true,
    splits: splits.map((s, i) => {
      const pct = Number(s.percentage);
      const amount = parseFloat(((pct / 100) * totalAmount).toFixed(2));
      return {
        userId: s.userId,
        userName: s.userName || s.userId,
        amount,
        percentage: pct,
      };
    }),
  };
}

/**
 * Calculate net balances for every user in a group.
 * A positive balance means the user is owed money.
 * A negative balance means the user owes money.
 *
 * @param {Array} expenses  — GroupExpense records with `splits` array
 * @param {Array} settlements — Settlement records
 * @returns {Object} { [userId]: { name, balance } }
 */
export function calculateBalances(expenses, settlements = []) {
  const balances = {}; // { userId: { name, balance } }

  const ensure = (userId, name) => {
    if (!balances[userId]) {
      balances[userId] = { name: name || userId, balance: 0 };
    }
  };

  // Expenses: payer gets credited, each split participant gets debited
  for (const expense of expenses) {
    ensure(expense.paidBy, expense.paidByName);
    for (const split of expense.splits) {
      ensure(split.userId, split.userName);
      // The payer is owed split.amount from each participant
      balances[expense.paidBy].balance += split.amount;
      // Each participant owes their share
      balances[split.userId].balance -= split.amount;
    }
  }

  // Settlements: cancel out existing balances
  for (const s of settlements) {
    ensure(s.fromUserId, s.fromUserName);
    ensure(s.toUserId, s.toUserName);
    balances[s.fromUserId].balance += s.amount; // payer's debt reduces
    balances[s.toUserId].balance -= s.amount; // receiver reduces their credit
  }

  return balances;
}

/**
 * Get the simplified list of "who owes whom" for a group.
 * Returns an array of { from, fromName, to, toName, amount } transactions
 * that clear all debts with minimum number of transfers.
 * @param {Object} balances — from calculateBalances()
 */
export function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  for (const [userId, { name, balance }] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ userId, name, amount: balance });
    else if (balance < -0.01) debtors.push({ userId, name, amount: -balance });
  }

  const transfers = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i];
    const credit = creditors[j];
    const settle = Math.min(debt.amount, credit.amount);

    transfers.push({
      from: debt.userId,
      fromName: debt.name,
      to: credit.userId,
      toName: credit.name,
      amount: parseFloat(settle.toFixed(2)),
    });

    debt.amount -= settle;
    credit.amount -= settle;

    if (debt.amount < 0.01) i++;
    if (credit.amount < 0.01) j++;
  }

  return transfers;
}
