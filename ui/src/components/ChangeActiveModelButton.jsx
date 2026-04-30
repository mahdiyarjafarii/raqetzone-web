import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";

import openaiImg from "@/assets/img/openai.png";
import anthropicImg from "@/assets/img/anthropic.jpg";
import googleImg from "@/assets/img/google.png";
import xaiImg from "@/assets/img/xai.png";
import perplexityImg from "@/assets/img/pplx.png";
import { currentModelAtom } from "@/config/state";
import { cn } from "@/lib/utils";
import ModelSelectorDialog from "./ModelSelectorDialog";
import apiClient from "@/lib/apiClient";
import myketImg from "/logo.png";

const providerImages = {
  openai: openaiImg,
  anthropic: anthropicImg,
  google: googleImg,
  xai: xaiImg,
  myket: myketImg,
  perplexity: perplexityImg,
};

function ChangeActiveModelButton({ disabled = false }) {
  const currentModel = useAtomValue(currentModelAtom);
  const [models, setModels] = useState([]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const getCurrentModelDetails = () => {
    return models.find((m) => m.id === currentModel.id) || currentModel;
  };

  const loadModels = async () => {
    const { data, ok } = await apiClient.get("/models");

    if (!ok) return toast.error(data?.message || "خطا در بارگذاری مدل‌ها");

    setModels(data.models || []);
  };

  const modelDetails = getCurrentModelDetails();

  return (
    <>
      <button
        onClick={() => setIsModelSelectorOpen(true)}
        className="flex flex-row-reverse items-center px-2 py-1 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all shadow-sm hover:shadow-md group"
        disabled={disabled}
      >
        {modelDetails ? (
          <>
            <img
              src={
                providerImages[modelDetails.provider.toLowerCase()] ||
                providerImages.myket
              }
              alt={modelDetails.provider}
              className={cn(
                "w-5 h-5 rounded",
                ["openai", "xai"].includes(
                  modelDetails.provider.toLowerCase()
                ) && "bg-white"
              )}
            />

            <div className="flex flex-col items-start ml-2">
              <span className="text-[12px] font-semibold text-foreground">
                {modelDetails.name}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Spinner className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              در حال بارگذاری...
            </span>
          </>
        )}

        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors ml-2" />
      </button>

      {/* Model Selector Dialog */}
      <ModelSelectorDialog
        open={isModelSelectorOpen}
        onOpenChange={setIsModelSelectorOpen}
      />
    </>
  );
}

export default ChangeActiveModelButton;
