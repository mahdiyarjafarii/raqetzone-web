export default function getSubscriptionType(subscriptionType, isFreeTrial) {
  if (isFreeTrial) return { name: "free-trial", credits: 10 };

  switch (subscriptionType) {
    case "basic":
      return { name: "basic", credits: 1500 };

    case "premium":
      return { name: "premium", credits: 2500 };

    case "unlimited":
      return { name: "unlimited", credits: 999999 };
  }
}
