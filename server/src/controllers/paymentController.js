import { eq, desc, and } from "drizzle-orm";
import axios from "axios";
import moment from "moment";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "../db/index.js";
import { transactions, users } from "../db/schema.js";
import { getPlanPrice } from "../utils/credits/getPlanPrice.js";
import { getPlanCredits } from "../utils/credits/getPlanCredits.js";
import { config } from "../config/env.js";
import { completeWalletTopup, failWalletTopup } from "./walletController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const successPaymentHtml = fs.readFileSync(
  path.join(__dirname, "../config/successPayment.html"),
  "utf-8"
);
const failedPaymentHtml = fs.readFileSync(
  path.join(__dirname, "../config/failedPayment.html"),
  "utf-8"
);

const gatewayClient = axios.create({
  baseURL: config.paymentGatewayUrl,
});

export const createPaymentController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, period } = req.body;

    // validate inputs
    if (!type || !period) {
      return res.status(400).json({ message: "نوع و مدت زمان الزامی است" });
    }

    // validate type
    if (!["basic", "premium", "pro"].includes(type)) {
      return res.status(400).json({ message: "نوع نامعتبر است" });
    }

    // validate period
    if (!["monthly", "quarterly", "halfYearly", "yearly"].includes(period)) {
      return res.status(400).json({ message: "مدت زمان نامعتبر است" });
    }

    // get price
    let price = getPlanPrice(type, period);
    if (!price) return res.status(400).json({ message: "قیمت نامعتبر است" });

    // if (vipNumbers.includes(req.user.phone)) price = 10000;

    // get the payment gateway url from third party
    const {
      data: { trackCode, token },
    } = await gatewayClient.post("/payment/request", {
      amount: price,
      cellNumber: req.user.phone.startsWith("0")
        ? req.user.phone.slice(1)
        : req.user.phone,
      description: `جهت خرید بسته ${type} - ${period}`,
    });

    await db.insert(transactions).values({
      userId,
      amount: price,
      type,
      period,
      trackCode,
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Create payment error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const redirectToCheckoutController = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) return res.status(400).json({ message: "توکن الزامی است" });

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>انتقال به درگاه پرداخت</title>
</head>
<body>
    <h2>در حال انتقال به درگاه پرداخت...</h2>
    <form id="paymentForm" action="https://sep.shaparak.ir/OnlinePG/OnlinePG" method="POST">
        <input type="hidden" name="Token" value="${token}">
        <input type="hidden" name="GetMethod" value="false">
    </form>

    <script>
        document.getElementById('paymentForm').submit();
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error("Redirect to checkout error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const callbackController = async (req, res) => {
  const {
    State,
    Status,
    RefNum,
    ResNum,
    TraceNo,
    SecurePan,
    HashedCardNumber,
    RRN,
  } = req.body;
  
  if(process.env.IS_DEV == "true") console.log(req.body);

  try {
    if (!ResNum) return res.status(400).json({ message: "توکن الزامی است" });

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.trackCode, ResNum));

    if (!transaction) {
      if (State !== "OK" || Status !== "2") {
        const failedWalletTopup = await failWalletTopup(ResNum, req.body);
        if (failedWalletTopup) return res.send(failedPaymentHtml);
      }

      const { data } = await gatewayClient.post("/payment/check", {
        RefNum,
      });

      if (data.status !== "success") throw new Error("Payment failed");

      const completedWalletTopup = await completeWalletTopup(ResNum, req.body);
      if (completedWalletTopup) return res.send(successPaymentHtml);

      return res.status(400).json({ message: "پرداخت یافت نشد" });
    }

    // update transaction callback body
    await db
      .update(transactions)
      .set({ callbackBody: req.body })
      .where(eq(transactions.trackCode, ResNum));

    if (State !== "OK" || Status !== "2") {
      await db
        .update(transactions)
        .set({ status: "failed" })
        .where(eq(transactions.trackCode, ResNum));

      return res.send(failedPaymentHtml);
    }

    // update transaction status using third party api
    const { data } = await gatewayClient.post("/payment/check", {
      RefNum,
    });

    if (data.status !== "success") throw new Error("Payment failed");

    await db
      .update(transactions)
      .set({ status: "completed" })
      .where(eq(transactions.trackCode, ResNum));

    // give user his subscription
    // Get current user credits
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, transaction.userId))
      .limit(1);

    const currentCredits = currentUser?.credits ?? 0;
    const baseCredits = getPlanCredits(transaction.type) ?? 10;
    const periodMultiplier = getPeriodInMonths(transaction.period) ?? 1;
    const creditsToAdd = baseCredits * periodMultiplier;
    
    await db
      .update(users)
      .set({
        subscriptionType: transaction.type,
        subscriptionEndDate: moment()
          .add(getPeriodInMonths(transaction.period), "month")
          .toDate(),
        credits: currentCredits + creditsToAdd,
      })
      .where(eq(users.id, transaction.userId));

    return res.send(successPaymentHtml);
  } catch (error) {
    if (ResNum) {
      await db
        .update(transactions)
        .set({ status: "failed" })
        .where(eq(transactions.trackCode, ResNum));
    }

    console.error("[Payment Callback] Error:", error);
    return res.send(failedPaymentHtml);
  }
};

export const getPaymentsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed")
        )
      )
      .orderBy(desc(transactions.createdAt));

    return res.status(200).json({ payments });
  } catch (error) {
    console.error("Get payments error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ============ HELPER: GET STATE MESSAGE ============
function getStateMessage(state, status) {
  const messages = {
    CanceledByUser: "Payment cancelled by user",
    Failed: "Payment failed",
    SessionIsNull: "Session expired - please try again",
    InvalidParameters: "Invalid payment parameters",
    MerchantIpAddressIsInvalid: "Merchant IP not authorized",
    TokenNotFound: "Payment token not found",
    TokenRequired: "Token required",
    TerminalNotFound: "Terminal not found",
  };

  return messages[state] || `Payment failed (Status: ${status})`;
}

function getPeriodInMonths(period) {
  const periods = {
    monthly: 1,
    quarterly: 3,
    halfYearly: 6,
    yearly: 12,
  };

  return periods[period];
}
