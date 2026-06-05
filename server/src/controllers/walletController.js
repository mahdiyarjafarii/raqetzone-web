import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { bookings, walletTransactions, wallets } from "../db/schema.js";

export async function ensureWallet(userId, tx = db) {
  const [existing] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing) return existing;

  const [created] = await tx.insert(wallets).values({ userId }).returning();
  return created;
}

export const getWalletController = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id);
    return res.status(200).json({ wallet });
  } catch (error) {
    console.error("getWallet error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getWalletTransactionsController = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, req.user.id))
      .orderBy(desc(walletTransactions.createdAt));

    return res.status(200).json({ transactions: rows });
  } catch (error) {
    console.error("getWalletTransactions error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createWalletTopupController = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isInteger(amount) || amount < 10000) {
      return res.status(400).json({ message: "مبلغ شارژ نامعتبر است" });
    }

    const result = await db.transaction(async (tx) => {
      const wallet = await ensureWallet(req.user.id, tx);

      const [updatedWallet] = await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id))
        .returning();

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet.id,
          userId: req.user.id,
          amount,
          direction: "credit",
          type: "manual_topup",
          status: "completed",
          metadata: { source: "dev_without_gateway" },
        })
        .returning();

      return { wallet: updatedWallet, transaction };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("createWalletTopup error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export async function completeWalletTopup(trackCode, callbackBody) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.gatewayTrackCode, trackCode), eq(walletTransactions.type, "topup")))
      .limit(1);

    if (!transaction) return null;
    if (transaction.status === "completed") return transaction;

    const wallet = await ensureWallet(transaction.userId, tx);

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${transaction.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    const [updated] = await tx
      .update(walletTransactions)
      .set({ walletId: wallet.id, status: "completed", callbackBody })
      .where(eq(walletTransactions.id, transaction.id))
      .returning();

    return updated;
  });
}

export async function failWalletTopup(trackCode, callbackBody) {
  const [updated] = await db
    .update(walletTransactions)
    .set({ status: "failed", callbackBody })
    .where(and(eq(walletTransactions.gatewayTrackCode, trackCode), eq(walletTransactions.type, "topup")))
    .returning();

  return updated ?? null;
}

export async function payBookingWithWallet({ userId, bookingId, amount }, txOrDb = db) {
  const run = async (tx) => {
    const wallet = await ensureWallet(userId, tx);

    const [updatedWallet] = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.id, wallet.id), gte(wallets.balance, amount)))
      .returning();

    if (!updatedWallet) {
      const error = new Error("موجودی کیف پول کافی نیست");
      error.statusCode = 400;
      throw error;
    }

    const [walletTransaction] = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId,
        amount,
        direction: "debit",
        type: "booking_payment",
        status: "completed",
        referenceType: "booking",
        referenceId: bookingId,
      })
      .returning();

    await tx
      .update(bookings)
      .set({
        paymentMethod: "wallet",
        paymentStatus: "paid",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    return { wallet: updatedWallet, walletTransaction };
  };

  if (txOrDb === db) return db.transaction(run);
  return run(txOrDb);
}
