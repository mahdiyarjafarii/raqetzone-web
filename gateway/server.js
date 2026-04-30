const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ============ MERCHANT CONFIGURATION ============
const MERCHANT_CONFIG = {
  terminalId: "15272476",
  merchantId: "15272476",
  redirectUrl: "https://ai.myket.ir/api/payment/callback",
//   redirectUrl: "http://10.73.194.73:3000/api/payment/callback",
  sepTokenUrl: "https://sep.shaparak.ir/onlinepg/onlinepg",
  sepPaymentUrl: "https://sep.shaparak.ir/OnlinePG/OnlinePG",
  sepVerifyUrl:
    "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction",
};

// ============ HELPER FUNCTIONS ============
function generateResNum() {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ STEP 1: REQUEST TOKEN AND REDIRECT TO PAYMENT ============
app.post("/api/payment/request", async (req, res) => {
  try {
    const { amount, cellNumber } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).send("Invalid amount");
    }

    // Generate unique transaction reference
    const resNum = generateResNum();

    // Prepare token request payload
    const tokenPayload = {
      action: "token",
      TerminalId: MERCHANT_CONFIG.terminalId,
      Amount: parseInt(amount),
      ResNum: resNum,
      RedirectUrl: MERCHANT_CONFIG.redirectUrl,
      CellNumber: cellNumber || undefined,
      TokenExpiryInMin: 20, // Token valid for 20 minutes
    };

    // console.log("Requesting token:", tokenPayload);

    // Request token from SEP
    const tokenResponse = await axios.post(
      MERCHANT_CONFIG.sepTokenUrl,
      tokenPayload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("Token response:", tokenResponse.data);

    if (tokenResponse.data.status !== 1 || !tokenResponse.data.token)
      throw new Error(tokenResponse.data.errorDesc || "Failed to get token");

    return res
      .status(200)
      .json({ token: tokenResponse.data.token, trackCode: resNum });
  } catch (error) {
    console.error("Payment request error:", error.message);
    res.status(500).send(`
      <h2>Payment Request Failed</h2>
      <p>Error: ${error.response?.data?.errorDesc || error.message}</p>
      <a href="/">Try Again</a>
    `);
  }
});

// ============ STEP 2: CALLBACK FROM PAYMENT GATEWAY ============
app.post("/api/payment/check", async (req, res) => {
  try {
    const { RefNum } = req.body;

    const verifyPayload = {
      RefNum,
      TerminalNumber: parseInt(MERCHANT_CONFIG.terminalId),
    };

    console.log("Verifying transaction:", verifyPayload);

    const verifyResponse = await axios.post(
      MERCHANT_CONFIG.sepVerifyUrl,
      verifyPayload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log("Verify response:", verifyResponse.data);

    if (!verifyResponse.data.Success || verifyResponse.data.ResultCode !== 0)
      throw new Error(
        verifyResponse.data.ResultDescription || "Verification failed"
      );

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Callback error:", error?.response?.data || error);
    res
      .status(500)
      .send({ status: "error", message: error.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`✅ SEP Payment Gateway Server running on port ${PORT}`);
  console.log(`📝 Terminal ID: ${MERCHANT_CONFIG.terminalId}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
