import { useState, useEffect } from "react";
import {
  Globe,
  Paperclip,
  Image,
  X,
  SendHorizonalIcon,
  History,
  Search,
  Brain,
  GemIcon,
  Plus,
  Settings2,
  BrushIcon,
} from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Textarea } from "@/components/ui/textarea";
import ChangeActiveModelButton from "../ChangeActiveModelButton";
import useAuth from "@/auth/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  currentModelAtom,
  hasTitleReachLimitPricingSheetAtom,
  showOverlayLoadingAtom,
  showHintAlertModalAtom,
  webSearchEnabledAtom,
  usageHintAtom,
  isThinkingModeAtom,
  searchModeAtom,
  reachLimitPricingSheetTriggerSourceAtom,
  isDeepResearchModeAtom,
  currentImageModelAtom,
  defaultImageModel,
} from "@/config/state";
import uploadImage from "@/lib/uploadImage";
import apiClient from "@/lib/apiClient";
import PREFERENCE_KEYS from "@/config/preferenceKeys";

export function AIInputWithSearch({
  id = "ai-input-with-search",
  placeholder = "پیام خود را وارد کنید...",
  minHeight = 48,
  maxHeight = 164,
  onSubmit,
  disabled = false,
  className,
  initialValue = "",
  gpt = null,
  setIsHistoryOpen,
  hasHistory = false,
}) {
  const [webSearchEnabled, setWebSearchEnabled] = useAtom(webSearchEnabledAtom);
  const [currentModel, setCurrentModel] = useAtom(currentModelAtom);
  const setIsThinkingMode = useSetAtom(isThinkingModeAtom);
  const setIsDeepResearchMode = useSetAtom(isDeepResearchModeAtom);
  const [usageHint, setUsageHintAtom] = useAtom(usageHintAtom);
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [showUpgradeCard, setShowUpgradeCard] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [searchMode, setSearchMode] = useAtom(searchModeAtom); // null, 'web', 'deep', 'thinking'
  const [, setShowReachLimitPricingSheet] = useAtom(showHintAlertModalAtom);
  const [, setHasTitleReachLimitPricingSheet] = useAtom(
    hasTitleReachLimitPricingSheetAtom
  );
  const [, setReachLimitTriggerSource] = useAtom(
    reachLimitPricingSheetTriggerSourceAtom
  );
  const [currentImageModel, setCurrentImageModel] = useAtom(currentImageModelAtom);

  const location = useLocation();

  const { currentUser } = useAuth();

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      adjustHeight();
    }
  }, [initialValue, adjustHeight]);

  const handleSubmit = () => {
    if (value.trim() || selectedImages.length > 0 || selectedFiles.length > 0) {
      const isImageGeneration = searchMode === "image";
      onSubmit?.(
        value,
        gpt ? true : webSearchEnabled,
        selectedImages,
        selectedFiles,
        isImageGeneration
          ? { isImageGeneration: true, imageModel: currentImageModel }
          : null
      );
      setValue("");
      setSelectedImages([]);
      setSelectedFiles([]);

      adjustHeight(true);
    }
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadImage = async () => {
    if (disabled) return;
    const result = await uploadImage(setShowOverlayLoading);
    if (result) setSelectedImages((prev) => [...prev, result]);
  };

  const setUsageHint = async (value) => {
    setUsageHintAtom(value);
    try {
      await apiClient.post(`/preference/${PREFERENCE_KEYS.USAGE_HINT}`, {
        value,
      });
    } catch (error) {
      console.error("Error saving usage hint preference:", error);
    }
  };

  return (
    <div
      className={cn(
        "w-full py-4 fixed bottom-0 left-0 right-0 px-3",
        className
      )}
    >
      <div className="relative max-w-xl w-full mx-auto bg-white dark:bg-background rounded-xl">
        {showUpgradeCard && (
          <div className="relative px-4 py-5 w-full space-y-2 flex justify-between items-center border rounded-xl mb-2 bg-white dark:bg-black text-black dark:text-white shadow-xl pointer-events-auto">
            <div>
              <p className="text-sm">
                قابلیت{" "}
                {selectedTool === "thinking"
                  ? "تفکر عمیق"
                  : selectedTool === "web"
                  ? "جستجوی وب"
                  : "کاوش عمیق"}{" "}
                تنها در بسته پلاس فعال است.
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedTool === "thinking"
                  ? "مناسب برای استدلال‌ قوی و حل مسائل پیچیده"
                  : selectedTool === "web"
                  ? "مناسب برای جستجوی اطلاعات وب"
                  : "مناسب برای کاوش عمیق"}
              </p>{" "}
            </div>

            <div className="flex items-center justify-end w-32">
              <button
                onClick={() => {
                  setReachLimitTriggerSource("header_subscribe_button");
                  setShowReachLimitPricingSheet(true);
                  setHasTitleReachLimitPricingSheet(false);
                }}
                className="text-sm rounded-full dark:bg-white dark:text-black bg-gray-100 mt-1 px-2 py-1"
              >
                خرید بسته{" "}
              </button>
            </div>

            <div className="flex items-center justify-end absolute left-1 top-1">
              <button
                onClick={() => setShowUpgradeCard(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
                aria-label="بستن"
                style={{ lineHeight: 0 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div
          className={`flex ${hasHistory ? "justify-between" : "justify-end"}`}
        >
          {hasHistory && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <History className="w-4 h-4" />
              نمایش تاریخچه
            </button>
          )}
          {!gpt && <ChangeActiveModelButton disabled={disabled} />}{" "}
        </div>

        {usageHint && location.pathname.includes("/chat") && (
          <div className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 pointer-events-none">
            <div className="p-4 absolute space-y-2 bottom-16 left-10 z-50 w-80 border rounded-xl bg-white dark:bg-black text-black dark:text-white shadow-xl pointer-events-auto">
              <p className="text-base">میزان مصرف جم</p>
              <p className="text-sm">
                اینجا میزان مصرف جم 💎 در هر پیام را می‌توانید مشاهده کنید.{" "}
              </p>{" "}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setUsageHint(false)}
                  className="text-sm text border dark:border-white rounded-md px-2 py-1 cursor-pointer"
                >
                  متوجه شدم
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {selectedImages.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full">
              {selectedImages.map((image, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-sky-500/15 text-sky-500 rounded-lg px-2 py-1 text-xs whitespace-nowrap"
                >
                  <Image className="w-3 h-3" />
                  <span className="max-w-[60px] truncate">{image.name}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="hover:bg-sky-500/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-sky-500/15 text-sky-500 rounded-lg px-2 py-1 text-xs whitespace-nowrap"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[60px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="hover:bg-sky-500/20 rounded-full p-0.5"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex flex-col">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Textarea
              id={id}
              value={value}
              placeholder={placeholder}
              className="w-full rounded-xl rounded-b-none px-4 py-3 border-none dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 resize-none focus-visible:ring-0 leading-[1.2] text-sm"
              ref={textareaRef}
              disabled={disabled}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
            />
          </div>

          <div className="h-12 rounded-b-xl bg-secondary">
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {/* Upload Image Button */}
              <button
                type="button"
                disabled={disabled}
                onClick={handleUploadImage}
                className={cn(
                  "relative rounded-lg p-2 transition-colors",
                  "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                )}
              >
                <Plus className="w-5 h-5" />
                {selectedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {selectedImages.length}
                  </span>
                )}
              </button>

              {/* Tools Dropdown */}
              {!gpt && (
                <DropdownMenu
                  open={isDropdownOpen}
                  onOpenChange={(open) => {
                    setIsDropdownOpen(open);
                  }}
                >
                  <DropdownMenuTrigger disabled={disabled} asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors",
                        "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <Settings2 className="w-4 h-4" />
                      <span className="text-sm">ابزارها</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    <DropdownMenuRadioGroup
                      value={searchMode || "none"}
                      onValueChange={(value) => {
                        if (
                          value &&
                          !currentUser?.subscriptionType &&
                          value !== "image"
                        ) {
                          setShowUpgradeCard(true);
                          setSelectedTool(value);
                          return;
                        }

                        setSearchMode(value === "none" ? null : value);
                        if (value === "web") setWebSearchEnabled(!webSearchEnabled);

                        if (value === "thinking") {
                          setIsThinkingMode(true);
                          setCurrentModel({
                            id: "0927996d-c41a-4866-88a2-468709d1edb0",
                            provider: "Perplexity",
                            name: "Perplexity Thinking",
                            slug: "sonar-deep-research",
                            price: 10,
                          });
                        } else setIsThinkingMode(false);
                        
                        if (value === "deep") {
                          setIsDeepResearchMode(true);
                          setCurrentModel({
                            id: "0927996d-c41a-4866-88a2-468709d1edb9",
                            provider: "Perplexity",
                            name: "Perplexity Deep Research",
                            slug: "perplexity/sonar-deep-research",
                            price: 10,
                          });
                        } else setIsDeepResearchMode(false);
                        
                        if (value === "image") setCurrentImageModel(defaultImageModel);
                        
                        setIsDropdownOpen(false);
                      }}
                    >
                      {currentModel.provider.toLowerCase() !== "openai" && (
                        <DropdownMenuRadioItem
                          value="web"
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 w-full justify-end">
                            <span>جستجوی وب</span>
                            <Search className="w-4 h-4" />
                          </div>
                        </DropdownMenuRadioItem>
                      )}

                      {
                        <>
                          {/* <DropdownMenuRadioItem
                            value="deep"
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full justify-end">
                              <span>کاوش عمیق</span>
                              <Globe className="w-4 h-4" />
                            </div>
                          </DropdownMenuRadioItem>

                          <DropdownMenuRadioItem
                            value="thinking"
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full justify-end">
                              <span>تفکر بیشتر</span>
                              <Brain className="w-4 h-4" />
                            </div>
                          </DropdownMenuRadioItem> */}
                        </>
                      }

                      <DropdownMenuRadioItem
                        value="image"
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full justify-end">
                          <span>تولید تصویر</span>
                          <BrushIcon className="w-4 h-4" />
                        </div>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Active Mode Badge - Clickable */}
              {!gpt && searchMode && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 border py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                    searchMode === "image"
                      ? "bg-purple-500/15 text-purple-500"
                      : "bg-sky-500/15 text-sky-500"
                  )}
                >
                  {searchMode === "web" && <Search className="w-3.5 h-3.5" />}
                  {searchMode === "deep" && <Globe className="w-3.5 h-3.5" />}
                  {searchMode === "thinking" && (
                    <Brain className="w-3.5 h-3.5" />
                  )}
                  {searchMode === "image" && (
                    <BrushIcon className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {searchMode === "web" && "جستجوی وب"}
                    {searchMode === "deep" && "کاوش عمیق"}
                    {searchMode === "thinking" && "تفکر بیشتر"}
                    {searchMode === "image" && "تولید تصویر"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchMode(null);
                      setIsThinkingMode(false);
                    }}
                    disabled={disabled}
                    className={cn(
                      "ml-0.5 p-0.5 hover:bg-opacity-20 rounded-full transition-colors"
                    )}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="absolute left-3 bottom-3 flex items-center gap-1">
              {(currentModel.price > 0 || gpt) && (
                <div className="flex items-center gap-1 z-50 ml-2">
                  <span className={`text-xs ${usageHint ? "text-white" : ""}`}>
                    {searchMode === "image"
                      ? currentImageModel.price || 20
                      : gpt
                      ? "15"
                      : currentModel.price}
                  </span>
                  <GemIcon className="w-4 h-4 text-gray-500" />
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  disabled ||
                  (!value.trim() &&
                    selectedImages.length === 0 &&
                    selectedFiles.length === 0)
                }
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  value || selectedImages.length > 0 || selectedFiles.length > 0
                    ? "bg-sky-500/15 text-sky-500"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <SendHorizonalIcon size={20} className="transform rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
