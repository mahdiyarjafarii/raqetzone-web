export const getPlanPrice = (type, period) => {
  const prices = {
    basic: {
      monthly: 299000,
      quarterly: 897000,
      halfYearly: 1399000,
      yearly: 2290000,
    },
    premium: {
      monthly: 450000,
      quarterly: 945000,
      halfYearly: 1620000,
      yearly: 2250000,
    },
    pro: {
      monthly: 790000,
      quarterly: 1659000,
      halfYearly: 2844000,
      yearly: 3950000,
    },
  };

  if(process.env.IS_DEV) return 10000;

  let finalPrice = prices[type]?.[period] ?? null;
  if(finalPrice) finalPrice = finalPrice * 10;

  return finalPrice;
};