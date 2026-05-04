import { inngest } from "./client";
import { db } from "@/lib/prisma";

// 1. Process Recurring Transaction
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    triggers: [{ event: "transaction.recurring.process" }],
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return;
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: { account: true },
      });

      if (!transaction) return;

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });
      });
    });
  }
);

// 2. Trigger Recurring Transactions (CRON)
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    const transactions = await db.transaction.findMany({
      where: { isRecurring: true },
    });

    if (transactions.length > 0) {
      const events = transactions.map((t) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: t.id,
          userId: t.userId,
        },
      }));

      await inngest.send(events);
    }

    return { triggered: transactions.length };
  }
);

// 3. Monthly Reports (CRON)
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
    triggers: [{ cron: "0 0 1 * *" }],
  },
  async () => {
    console.log("Monthly report function triggered");
  }
);

// 4. Budget Alerts (CRON + EVENT)
export const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    name: "Check Budget Alerts",
    triggers: [
      { cron: "0 */6 * * *" },
      { event: "budget.alert.check" },
    ],
  },
  async ({ step }) => {
    const budgets = await db.budget.findMany({
      include: {
        user: {
          include: {
            accounts: { where: { isDefault: true } },
          },
        },
      },
    });

    for (const budget of budgets) {
      const account = budget.user.accounts[0];
      if (!account) continue;

      const startDate = new Date();
      startDate.setDate(1);

      const expenses = await db.transaction.aggregate({
        where: {
          userId: budget.userId,
          accountId: account.id,
          type: "EXPENSE",
          date: { gte: startDate },
        },
        _sum: { amount: true },
      });

      const totalExpenses = expenses._sum.amount?.toNumber() || 0;
      const percentageUsed = (totalExpenses / budget.amount) * 100;

      console.log("INNGEST DEBUG:", { percentageUsed });

      if (percentageUsed >= 80) {
        console.log("⚠️ Budget exceeded for user:", budget.user.email);
      }
    }
  }
);