import apiClient from "@/lib/apiClient";

export const walletService = {
  getWallet: () => apiClient.get("/wallet"),
  getTransactions: () => apiClient.get("/wallet/transactions"),
  topup: (amount) => apiClient.post("/wallet/topup", { amount }),
};
