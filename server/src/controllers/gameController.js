import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { tennisDuelRewards, tennisDuelSessions, walletTransactions, wallets } from "../db/schema.js";

const WIN_SCORE = 7;
const REWARD_TOMAN = 30000;

async function ensureWallet(userId, tx) {
  const [existingWallet] = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (existingWallet) return existingWallet;

  const [createdWallet] = await tx
    .insert(wallets)
    .values({ userId })
    .returning();

  return createdWallet;
}

function getTehranDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const getTennisDuelOverviewController = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayKey = getTehranDateKey();

    const [todayReward] = await db
      .select({ id: tennisDuelRewards.id })
      .from(tennisDuelRewards)
      .where(
        and(
          eq(tennisDuelRewards.userId, userId),
          eq(tennisDuelRewards.rewardDateKey, todayKey)
        )
      )
      .limit(1);

    const [bestToday] = await db
      .select({ bestScore: sql`COALESCE(MAX(${tennisDuelSessions.score}), 0)` })
      .from(tennisDuelSessions)
      .where(
        and(
          eq(tennisDuelSessions.userId, userId),
          isNotNull(tennisDuelSessions.submittedAt),
          sql`${tennisDuelSessions.createdAt} >= date_trunc('day', now() at time zone 'Asia/Tehran')`,
          sql`${tennisDuelSessions.createdAt} < date_trunc('day', now() at time zone 'Asia/Tehran') + interval '1 day'`
        )
      );

    return res.status(200).json({
      game: {
        key: "tennis-duel",
        winScore: WIN_SCORE,
        rewardToman: REWARD_TOMAN,
      },
      dailyRewardClaimed: Boolean(todayReward),
      bestScoreToday: Number(bestToday?.bestScore ?? 0),
      todayDateKey: todayKey,
    });
  } catch (error) {
    console.error("getTennisDuelOverview error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const startTennisDuelController = async (req, res) => {
  try {
    const [session] = await db
      .insert(tennisDuelSessions)
      .values({
        userId: req.user.id,
        startedAt: new Date(),
        clientMeta: {
          userAgent: req.headers["user-agent"] ?? null,
        },
      })
      .returning({
        id: tennisDuelSessions.id,
        startedAt: tennisDuelSessions.startedAt,
      });

    return res.status(201).json({
      session,
      game: {
        key: "tennis-duel",
        winScore: WIN_SCORE,
        rewardToman: REWARD_TOMAN,
      },
    });
  } catch (error) {
    console.error("startTennisDuel error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const submitTennisDuelController = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const scoreRaw = Number(req.body?.score);
    const won = req.body?.won === true;

    if (!Number.isFinite(scoreRaw) || scoreRaw < 0) {
      return res.status(400).json({ message: "امتیاز نامعتبر است" });
    }

    const score = Math.floor(scoreRaw);
    if (won && score < WIN_SCORE) {
      return res.status(400).json({ message: "نتیجه برد نامعتبر است" });
    }

    const [session] = await db
      .select()
      .from(tennisDuelSessions)
      .where(
        and(
          eq(tennisDuelSessions.id, sessionId),
          eq(tennisDuelSessions.userId, req.user.id)
        )
      )
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "سشن بازی پیدا نشد" });
    }

    if (session.submittedAt) {
      return res.status(409).json({ message: "این سشن قبلاً ثبت شده است" });
    }

    await db
      .update(tennisDuelSessions)
      .set({
        score,
        won,
        submittedAt: new Date(),
      })
      .where(eq(tennisDuelSessions.id, session.id));

    if (!won) {
      return res.status(200).json({
        rewarded: false,
        score,
        message: "نتیجه ثبت شد. برای دریافت جایزه باید بازی را ببرید.",
      });
    }

    const todayKey = getTehranDateKey();

    const [todayReward] = await db
      .select({ id: tennisDuelRewards.id })
      .from(tennisDuelRewards)
      .where(
        and(
          eq(tennisDuelRewards.userId, req.user.id),
          eq(tennisDuelRewards.rewardDateKey, todayKey)
        )
      )
      .limit(1);

    if (todayReward) {
      return res.status(200).json({
        rewarded: false,
        score,
        message: "امروز جایزه این بازی را گرفته‌اید.",
      });
    }

    const rewardResult = await db.transaction(async (tx) => {
      const wallet = await ensureWallet(req.user.id, tx);

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${REWARD_TOMAN}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const [updatedWallet] = await tx
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.id, wallet.id))
        .limit(1);

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        userId: req.user.id,
        amount: REWARD_TOMAN,
        direction: "credit",
        type: "game_reward",
        status: "completed",
        referenceType: "tennis_duel_session",
        referenceId: session.id,
        metadata: {
          game: "tennis-duel",
          score,
          rewardDateKey: todayKey,
        },
      });

      await tx.insert(tennisDuelRewards).values({
        userId: req.user.id,
        sessionId: session.id,
        score,
        creditsGranted: REWARD_TOMAN,
        rewardDateKey: todayKey,
      });

      await tx
        .update(tennisDuelSessions)
        .set({ rewardGranted: true })
        .where(eq(tennisDuelSessions.id, session.id));

      return { walletBalance: Number(updatedWallet?.balance ?? 0) };
    });

    return res.status(200).json({
      rewarded: true,
      score,
      walletAmountAdded: REWARD_TOMAN,
      walletBalance: rewardResult.walletBalance,
      message: "تبریک! جایزه بازی به کیف پولت اضافه شد.",
    });
  } catch (error) {
    console.error("submitTennisDuel error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getTennisDuelHistoryController = async (req, res) => {
  try {
    const sessions = await db
      .select({
        id: tennisDuelSessions.id,
        score: tennisDuelSessions.score,
        won: tennisDuelSessions.won,
        rewardGranted: tennisDuelSessions.rewardGranted,
        submittedAt: tennisDuelSessions.submittedAt,
      })
      .from(tennisDuelSessions)
      .where(eq(tennisDuelSessions.userId, req.user.id))
      .orderBy(desc(tennisDuelSessions.createdAt))
      .limit(10);

    return res.status(200).json({ sessions });
  } catch (error) {
    console.error("getTennisDuelHistory error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
