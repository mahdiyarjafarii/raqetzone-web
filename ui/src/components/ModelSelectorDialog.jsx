import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAtom } from "jotai";
import { X, GemIcon } from "lucide-react";
import { BottomSheet } from "react-spring-bottom-sheet";

import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  currentModelAtom,
  showReachLimitPricingSheetAtom,
  hasTitleReachLimitPricingSheetAtom,
  reachLimitPricingSheetTriggerSourceAtom,
} from "@/config/state";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/auth/useAuth";

import openaiImg from "@/assets/img/openai.png";
import anthropicImg from "@/assets/img/anthropic.jpg";
import googleImg from "@/assets/img/google.png";
import xaiImg from "@/assets/img/xai.png";
import myketImg from "/logo.png";
import perplexityImg from "@/assets/img/pplx.png";

import "react-spring-bottom-sheet/dist/style.css";

const providerImages = {
  openai: openaiImg,
  anthropic: anthropicImg,
  google: googleImg,
  xai: xaiImg,
  myket: myketImg,
  perplexity: perplexityImg,
};

function ModelSelectorDialog({ open, onOpenChange }) {
  const [currentModel, setCurrentModel] = useAtom(currentModelAtom);
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [, setShowReachLimitPricingSheet] = useAtom(
    showReachLimitPricingSheetAtom
  );
  const [, setHasTitleReachLimitPricingSheet] = useAtom(
    hasTitleReachLimitPricingSheetAtom
  );
  const [, setReachLimitTriggerSource] = useAtom(
    reachLimitPricingSheetTriggerSourceAtom
  );
  const { currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open]);

  const loadModels = async () => {
    setIsLoadingModels(true);

    const { data, ok } = await apiClient.get("/models");
    setIsLoadingModels(false);

    if (!ok) return toast.error(data?.message || "خطا در بارگذاری مدل‌ها");

    setModels(data.models || []);
  };

  // Filter models by provider and search query
  const getFilteredModels = () => {
    let filtered = models;

    // Filter by provider
    if (selectedProvider !== "all") {
      filtered = filtered.filter(
        (m) => m.provider.toLowerCase() === selectedProvider.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.slug.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Group models by provider
  const groupedModels = () => {
    const filtered = getFilteredModels();
    const grouped = {};

    filtered.forEach((model) => {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    });

    Object.keys(grouped).forEach((provider) => {
      grouped[provider].sort((a, b) => {
        const priceA =
          parseFloat(a.price?.toString().replace(/[^\d.]/g, "")) || 0;
        const priceB =
          parseFloat(b.price?.toString().replace(/[^\d.]/g, "")) || 0;
        return priceA - priceB;
      });
    });

    // Sort providers: OpenAI first, then others
    const sortedGrouped = {};
    const providerKeys = Object.keys(grouped);
    const openaiKey = providerKeys.find(
      (key) => key.toLowerCase() === "openai"
    );
    const otherKeys = providerKeys.filter(
      (key) => key.toLowerCase() !== "openai"
    );

    if (openaiKey) {
      sortedGrouped[openaiKey] = grouped[openaiKey];
    }

    otherKeys.forEach((key) => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  };

  // Get unique providers
  const getProviders = () => {
    const providers = [...new Set(models.map((m) => m.provider.toLowerCase()))];
    return providers;
  };

  const handleModelSelect = (model) => {
    setCurrentModel({
      id: model.id,
      provider: model.provider,
      name: model.name,
      slug: model.slug,
      price: model.price,
    });
    onOpenChange(false);
    toast.success(`مدل ${model.name} انتخاب شد`);
  };

  const handleNoSubscription = () => {
    setReachLimitTriggerSource("model_selector_no_subscription");
    setShowReachLimitPricingSheet(true);
    setHasTitleReachLimitPricingSheet(false);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={() => onOpenChange(false)}
      defaultSnap={({ maxHeight }) => maxHeight * 0.9}
      snapPoints={({ maxHeight }) => [maxHeight * 0.9]}
      blocking={true}
      scrollLocking={true}
      className="bottom-sheet"
    >
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between pt-2 sticky top-0 bg-background z-20">
          <h2 className="text-lg font-bold">انتخاب مدل</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center">
          <p className="text-sm text-muted-foreground">
            جم‌ها 💎 اعتبار شما برای استفاده از مدل‌ها هستند
          </p>
        </div>
        {/* Provider Filter */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setSelectedProvider("all")}
            className={cn(
              "h-9 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              selectedProvider === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            همه
          </button>

          {getProviders().map((provider) => (
            <Badge
              key={provider}
              variant={selectedProvider === provider ? "default" : "secondary"}
              onClick={() => setSelectedProvider(provider)}
            >
              <span className="capitalize ml-1 mt-0.5">
                {provider === "myket" ? "خودکار" : provider}
              </span>
              <img
                src={providerImages[provider]}
                alt={provider}
                className="w-5 h-5 rounded"
              />
            </Badge>
          ))}
        </div>

        {/* Models List */}
        {isLoadingModels ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(groupedModels()).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">مدلی یافت نشد</p>
              </div>
            ) : (
              Object.entries(groupedModels()).map(
                ([provider, providerModels]) => (
                  <div key={provider} className="space-y-3">
                    {/* Provider Header */}
                    <div className="flex items-center gap-2 py-2">
                      <img
                        src={providerImages[provider.toLowerCase()]}
                        alt={provider}
                        className="w-6 h-6 rounded"
                      />
                      <h3 className="text-sm font-bold capitalize">
                        {provider === "Myket" ? "خودکار" : provider}
                      </h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Models Grid */}
                    <div className="grid grid-cols-1 gap-2">
                      {providerModels.map((model) => {
                        const isSelected = currentModel?.id === model.id;
                        return (
                          <div
                            key={model.id}
                            className={cn(
                              "border-border bg-card hover:bg-accent/50 flex items-start gap-3 p-3 rounded-lg border transition-all text-right group hover:shadow-md"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center h-full">
                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                      {model.name}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {model.provider === "Myket"
                                      ? "Default"
                                      : model.provider}{" "}
                                    • {model.type}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 h-full">
                                  <div className="flex items-center gap-2 text-primary">
                                    <span className="text-sm mt-[2px]">
                                      مصرف هر پیام : {model.price}
                                    </span>
                                    <GemIcon size={15} />
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (
                                        !currentUser.subscriptionType &&
                                        model.provider.toLowerCase() !== "myket"
                                      ) {
                                        handleNoSubscription();
                                        return;
                                      }
                                      console.log(model);
                                      handleModelSelect(model);
                                    }}
                                    className="text-sm text-white bg-primary border border-primary rounded-md px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                                  >
                                    {isSelected ? "انتخاب شده" : "انتخاب"}
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp- mt-1">
                                {model.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default ModelSelectorDialog;
