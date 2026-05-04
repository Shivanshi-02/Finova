"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import {
  inferReceiptTransactionType,
  mapReceiptCategory,
} from "@/lib/receipt/scanHelpers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const normalizedData = {
      ...data,
      amount: Number(data.amount),
      type: data.type?.toUpperCase(),
      date: new Date(data.date),
    };

    if (!Number.isFinite(normalizedData.amount)) {
      throw new Error("Invalid amount");
    }
    if (!normalizedData.type || !["INCOME", "EXPENSE"].includes(normalizedData.type)) {
      throw new Error("Invalid type");
    }
    if (Number.isNaN(normalizedData.date.getTime())) {
      throw new Error("Invalid date");
    }

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: normalizedData.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const amount = Math.abs(normalizedData.amount);
    const balanceChange =
      normalizedData.type === "EXPENSE"
        ? -amount
        : amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...normalizedData,
          userId: user.id,
          nextRecurringDate:
            normalizedData.isRecurring && normalizedData.recurringInterval
              ? calculateNextRecurringDate(normalizedData.date, normalizedData.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: normalizedData.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    const oldAmount = Math.abs(originalTransaction.amount.toNumber());
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -oldAmount
        : oldAmount;

    const newAmount = Math.abs(data.amount);
    const newBalanceChange =
      data.type === "EXPENSE" ? -newAmount : newAmount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function extractReceiptDataFromGemini(file) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const arrayBuffer = await file.arrayBuffer();
  const base64String = Buffer.from(arrayBuffer).toString("base64");

  const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number, positive)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense,salary,freelance,other-income )
      - hintType — only if strongly implied: use "INCOME" for paycheck / salary / payment-received style documents, otherwise "EXPENSE", or omit if unsure

      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string",
        "hintType": "INCOME" | "EXPENSE" | ""
      }

      If its not a recipt, return an empty object
    `;

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64String,
        mimeType: file.type,
      },
    },
    prompt,
  ]);

  const response = await result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
  let data;

  try {
    data = JSON.parse(cleanedText);
  } catch {
    console.error("[extractReceiptDataFromGemini] JSON parse failed", cleanedText);
    throw new Error("Invalid response format from Gemini");
  }

  return data || {};
}

// Scan Receipt
export async function scanReceipt(file) {
  try {
    const data = await extractReceiptDataFromGemini(file);
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Could not extract receipt details");
    }
    const amount = Number(data.amount);
    const d = data.date ? new Date(data.date) : new Date();
    return {
      amount: Number.isFinite(amount) ? amount : NaN,
      date: d,
      description: data.description,
      category: data.category,
      merchantName: data.merchantName,
      hintType: data.hintType,
    };
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error(error.message || "Failed to scan receipt");
  }
}

/**
 * OCR + Gemini extract, then CREATE transaction immediately.
 * @deprecated This was the old auto-create flow. 
 * Now we use scanReceipt + form filling in transaction-form.jsx
 */
export async function createTransactionFromReceiptScan(file, accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const req = await request();
    const decision = await aj.protect(req, { userId, requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        console.error("[createTransactionFromReceiptScan] rate limited");
        throw new Error("Too many requests. Please try again later.");
      }
      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    if (!accountId) throw new Error("Account is required");

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    const data = await extractReceiptDataFromGemini(file);

    console.log("[createTransactionFromReceiptScan] Raw Gemini:", data);

    if (!data || Object.keys(data).length === 0) {
      throw new Error("Could not extract receipt details");
    }

    const rawAmount = Number(data.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      throw new Error("Could not read a valid amount from receipt");
    }
    const positiveAmount = Math.abs(rawAmount);

    const parsedForType = {
      description: data.description,
      merchantName: data.merchantName,
      category: data.category,
      hintType: data.hintType,
    };
    const type = inferReceiptTransactionType(parsedForType);

    const category =
      !data.category || !String(data.category).trim()
        ? "Misc"
        : mapReceiptCategory(String(data.category), type);

    const txnDateRaw = data.date ? new Date(data.date) : new Date();
    const txnDate =
      txnDateRaw instanceof Date && !Number.isNaN(txnDateRaw.getTime())
        ? txnDateRaw
        : new Date();

    const description =
      [data.merchantName, data.description]
        .filter(Boolean)
        .join(" • ")
        .trim() || "Scanned receipt";

    console.log("[createTransactionFromReceiptScan]", {
      type,
      category,
      positiveAmount,
      txnDate,
      description,
    });

    const amountDec = new Prisma.Decimal(Number(positiveAmount));
    const balanceDelta =
      type === "EXPENSE" ? amountDec.negated() : amountDec;

    const created = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount: amountDec,
          type,
          category,
          description,
          date: txnDate,
          userId: user.id,
          accountId,
          status: "COMPLETED",
          isRecurring: false,
        },
      });

      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceDelta } },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${created.accountId}`);

    return { success: true, data: serializeAmount(created) };
  } catch (error) {
    console.error("createTransactionFromReceiptScan:", error);
    throw new Error(error.message || "Failed to create transaction from receipt");
  }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}