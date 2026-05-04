import { db } from "@/lib/prisma";
import { sendBudgetAlertEmail } from "@/lib/groups/email"; // ✅ correct function

export async function GET() {
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

    console.log("DEBUG:", { totalExpenses, percentageUsed });

    
    if (percentageUsed >= 80) {
      await sendBudgetAlertEmail({
        to: budget.user.email,
        userName: budget.user.name,
        percentageUsed,
        totalExpenses,
        budgetAmount: budget.amount,
        accountName: account.name,
      });
    }
  }

  return Response.json({ success: true });
}