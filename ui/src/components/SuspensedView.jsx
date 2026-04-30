import { Suspense } from "react";
import TopBarProgress from "react-topbar-progress-indicator";

const SuspensedView = ({ children }) => {
  TopBarProgress.config({
    barColors: {
      0: "#0096FF",
      "1.0": "#0096FF",
    },
    barThickness: 3,
    shadowBlur: 5,
    shadowColor: "#0096FF",
  });

  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>;
};

export default SuspensedView;
