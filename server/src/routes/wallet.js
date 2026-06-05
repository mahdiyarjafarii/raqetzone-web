import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createWalletTopupController,
  getWalletController,
  getWalletTransactionsController,
} from "../controllers/walletController.js";

const router = Router();

router.get("/wallet", authMiddleware, getWalletController);
router.get("/wallet/transactions", authMiddleware, getWalletTransactionsController);
router.post("/wallet/topup", authMiddleware, createWalletTopupController);

export default router;
