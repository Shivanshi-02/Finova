const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

// 🔹 helpers
function randomAmount(min, max) {
  return new Prisma.Decimal(
    Math.floor(Math.random() * (max - min) + min)
  );
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 🔥 weighted realistic categories
const weightedExpenseData = [
  ...Array(5).fill({ category: "Food", descriptions: ["Swiggy order", "Dinner", "Lunch"] }),
  ...Array(4).fill({ category: "Transport", descriptions: ["Uber ride", "Fuel", "Metro"] }),
  ...Array(3).fill({ category: "Groceries", descriptions: ["Supermarket shopping"] }),
  ...Array(2).fill({ category: "Utilities", descriptions: ["Electricity bill", "WiFi"] }),
  ...Array(2).fill({ category: "Shopping", descriptions: ["Amazon order", "Clothing"] }),
  ...Array(1).fill({ category: "Entertainment", descriptions: ["Movie", "Netflix"] }),
  ...Array(1).fill({ category: "Health", descriptions: ["Medicines", "Doctor visit"] }),
  ...Array(1).fill({ category: "Education", descriptions: ["Books", "Course"] }),
];

async function main() {
  console.log("🌱 Seeding realistic data...");

  await prisma.transaction.deleteMany();

  // 👤 user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: "demo@gmail.com", name: "Demo User" },
    });
  }

  // 🏦 account
  let account = await prisma.account.findFirst({
    where: { userId: user.id },
  });

  if (!account) {
    account = await prisma.account.create({
      data: {
        name: "Main Account",
        type: "SAVINGS",
        balance: new Prisma.Decimal(50000),
        userId: user.id,
      },
    });
  }

  const data = [];
  const today = new Date("2026-05-03");

  const dailyCount = {};
  let lastCategory = null;

  for (let i = 0; i < 500; i++) {
    let date;

    // 🔥 better time distribution
    const rand = Math.random();

    if (rand < 0.4) {
      const daysAgo = Math.floor(Math.random() * 7);
      date = new Date();
      date.setDate(today.getDate() - daysAgo);
    } else if (rand < 0.75) {
      const daysAgo = Math.floor(Math.random() * 30);
      date = new Date();
      date.setDate(today.getDate() - daysAgo);
    } else {
      const monthsAgo = Math.floor(Math.random() * 6);
      date = new Date();
      date.setMonth(today.getMonth() - monthsAgo);
      date.setDate(Math.floor(Math.random() * 28) + 1);
    }

    const dayKey = date.toDateString();

    if (!dailyCount[dayKey]) dailyCount[dayKey] = 0;
    if (dailyCount[dayKey] >= 3) continue;
    dailyCount[dayKey]++;

    const isExpense = Math.random() < 0.8;

    let entry;

    if (isExpense) {
      let selected;

      // 🔥 avoid same category repeat
      do {
        selected = randomItem(weightedExpenseData);
      } while (selected.category === lastCategory);

      lastCategory = selected.category;

      entry = {
        type: "EXPENSE",
        amount: randomAmount(100, 1500),
        category: selected.category,
        description: randomItem(selected.descriptions),
      };
    } else {
      // 🔥 realistic income pattern

      const incomeType = Math.random();

      if (incomeType < 0.4) {
        entry = {
          type: "INCOME",
          amount: randomAmount(25000, 40000),
          category: "Salary",
          description: "Monthly salary credited",
        };
      } else {
        entry = {
          type: "INCOME",
          amount: randomAmount(2000, 8000),
          category: "Freelance",
          description: "Freelance payment",
        };
      }
    }

    data.push({
      ...entry,
      date,
      isRecurring: false,
      status: "COMPLETED",
      userId: user.id,
      accountId: account.id,
    });
  }

  await prisma.transaction.createMany({ data });

  console.log("✅ Clean realistic dataset created!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());