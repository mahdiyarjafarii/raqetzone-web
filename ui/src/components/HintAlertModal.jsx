import React from "react";
import { useAtom } from "jotai";
import { CustomDialog } from "./ui/dialog";
import {
  showHintAlertModalAtom,
  showReachLimitPricingSheetAtom,
  reachLimitPricingSheetTriggerSourceAtom,
} from "@/config/state";
import useAuth from "@/auth/useAuth";

const HintAlertModal = () => {
  const [open, setOpen] = useAtom(showHintAlertModalAtom);
  const [, setShowReachLimitPricingSheet] = useAtom(
    showReachLimitPricingSheetAtom
  );
  const [, setReachLimitTriggerSource] = useAtom(
    reachLimitPricingSheetTriggerSourceAtom
  );
  const { currentUser } = useAuth();

  return (
    <CustomDialog
      title=""
      open={open}
      onOpenChange={setOpen}
      showCloseButton={true}
      modal={true}
      canClose={true}
    >
      <div className="space-y-4">
        <div className="text-center text-sm leading-relaxed space-y-1">
          <div className="text-base font-bold mb-4 -mt-4">
            برای ادامه، نیاز به جم 💎 بیشتری دارید.{" "}
          </div>
          <div className="">
            تعداد 💎 جم فعلی شما:{" "}
            {currentUser?.credits?.remaining || currentUser?.credits || 0}{" "}
          </div>
          <div>با خرید اشتراک، جم‌های خود را افزایش دهید.</div>
        </div>
        <button
          onClick={() => {
            setReachLimitTriggerSource("hint_alert_modal");
            setShowReachLimitPricingSheet(true);
            setOpen(false);
          }}
          className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white py-3 font-bold text-base transition-colors"
        >
          خرید اشتراک
        </button>
      </div>
    </CustomDialog>
  );
};

export default HintAlertModal;
