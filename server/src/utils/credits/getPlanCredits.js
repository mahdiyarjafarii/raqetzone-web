export const getPlanCredits = (type) => {
  const plans = {
    basic: 1500,
    premium: 3000,
    pro: 10000,
  };

  return plans[type] ?? null;
};