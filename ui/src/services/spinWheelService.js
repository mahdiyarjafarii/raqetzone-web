import apiClient from "@/lib/apiClient";

export const spinWheelService = {
  getEligibility: () => apiClient.get("/spin-wheel/eligibility"),
  spin: (reason, prizeLabel) => apiClient.post("/spin-wheel/spin", { reason, prizeLabel }),
};
