import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { ChevronLeft } from "lucide-react";
import { useSetAtom } from "jotai";

import uploadImage from "@/lib/uploadImage";
import {
  currentModelAtom,
  showOverlayLoadingAtom,
  webSearchCapableModel,
  currentImageModelAtom,
  defaultImageModel
} from "@/config/state";

import "swiper/css";
import "swiper/css/free-mode";

const promptCategories = [
  {
    id: "suggested",
    name: "برگزیده‌ها",
    prompts: [
      { emoji: "🎲", text: "چند تا بازی برای دورهمی‌ها پیشنهاد بده." },
      { emoji: "📱", text: "در نوشتن کپشن برای اینستاگرام یا یوتیوب کمکم کن." },
      { emoji: "💪", text: "چطور نه گفتن رو تمرین کنم؟" },
      { emoji: "✏️", text: "متنی که برات میفرستم رو بهبودش بده." },
      { emoji: "🍽️", text: "یک دستور غذای سریع و راحت پیشنهاد بده." },
    ],
  },
  {
    id: "general",
    name: "عمومی",
    prompts: [
      { emoji: "😂", text: "میم ۷ ۶ که محبوب شده چیه؟" },
      { emoji: "🌐", text: "این متن رو ترجمه کن." },
      { emoji: "🎁", text: "برای تولد دوستم چی بخرم؟" },
      { emoji: "✈️", text: "برای مهاجرت از کجا شروع کنم؟" },
      { emoji: "🙃", text: "حوصله‌م سر رفته؛ چی کار کنم؟" },
    ],
  },
  {
    id: "daily",
    name: "زندگی روزمره",
    prompts: [
      { emoji: "💰", text: "قیمت طلا امروز چنده؟" },
      { emoji: "🧽", text: "چطور لکه روغن رو از لباس پاک کنم؟" },
      { emoji: "🤝", text: "دعوا با همسرم رو چطور حل کنم؟" },
      { emoji: "🎨", text: "برای یک استایل خوب چه رنگ‌هایی رو ست کنم؟" },
      { emoji: "📅", text: "چطور کارهای روزانه رو بهتر مدیریت کنم؟" },
    ],
  },
  {
    id: "sports",
    name: "تناسب اندام",
    prompts: [
      { emoji: "💊", text: "پروتئین وی لازمه؟" },
      { emoji: "💪", text: "چه‌جوری ورزش کنم که سیکس پک داشته باشم؟" },
      { emoji: "📋", text: "یک برنامه غذایی هفتگی برای کاهش وزن بده." },
      { emoji: "🏠", text: "برنامه ورزشی خانگی بدون وسیله بده." },
      {
        emoji: "😊",
        text: "چه‌جوری جلوی لاغر شدن صورت رو موقع ورزش و رژیم بگیرم؟",
      },
    ],
  },

  {
    id: "education",
    name: "تحصیل",
    prompts: [
      { emoji: "🗣️", text: "به من در یک ارائه درسی کمک کن." },
      {
        emoji: "📝",
        text: "چند تکنیک برای تست زدن تو کنکور بهم یاد بده.",
      },
      { emoji: "✍️", text: "یک انشا درباره این موضوع بنویس." },
      { emoji: "🎓", text: "توی انتخاب رشته تحصیلی کمکم کن." },
      {
        emoji: "🎮",
        text: "برای تمرین و یادگیری دانش‌آموز دبستانی یک بازی طراحی کن.",
      },
    ],
  },
];

const quickSuggestions = [
  { id: "find-court", text: "یه زمین پدل برای فردا ساعت ۲ پیدا کن" },
  { id: "arrange-game", text: "یه بازی برام تو زمین چیتگر درست کن" },
  { id: "best-option", text: "بهترین زمین‌های پدل نزدیک من رو پیشنهاد بده" },
  { id: "reserve", text: "برای جمعه ساعت ۶ عصر یه سانس پدل رزرو کن" },
];

function PromptSuggestions({ onSelectPrompt }) {
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const setCurrentModel = useSetAtom(currentModelAtom);
  const setCurrentImageModel = useSetAtom(currentImageModelAtom);

  const [selectedCategory, setSelectedCategory] = useState("suggested");
  const [isExpanded, setIsExpanded] = useState(false);

  const currentCategory = promptCategories.find(
    (cat) => cat.id === selectedCategory
  );

  const handleCaptionImageUpload = async () => {
    // Use the Myket upload API to get a properly uploaded image
    const result = await uploadImage(setShowOverlayLoading);

    if (result) {
      // Auto-submit with the caption text and the uploaded image
      const captionSuggestion = quickSuggestions.find(
        (s) => s.id === "caption"
      );
      onSelectPrompt?.(
        captionSuggestion.text,
        [result],
        "9c5ee640-6602-44d0-96c9-d46b73167ef3"
      );
    }
  };

  const handleQuickSuggestionClick = (suggestion) => {
    if (suggestion.id === "image") {
      setCurrentImageModel(defaultImageModel);
      return onSelectPrompt?.({ type: "image", prompt: suggestion.text });
    } else if (suggestion.id === "caption") {
      // Trigger the Myket image upload
      return handleCaptionImageUpload();
    } else if (suggestion.id === "gold-rate") {
      setCurrentModel(webSearchCapableModel);
    }

    onSelectPrompt?.(suggestion.text);
  };

  return (
    <div className="py-6">
      {!isExpanded ? (
        <div>
          <p className="text-xl font-extrabold mt-12 mb-3 text-center">
            چطور می‌توانم کمک کنم؟
          </p>

          {/* Quick Suggestions - Collapsed View */}
          <div className="flex flex-col gap-3 mb-4 px-6">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleQuickSuggestionClick(suggestion)}
                className="w-full py-3 px-4 rounded-full border border-border text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all text-center"
              >
                {suggestion.text}
              </button>
            ))}
          </div>

          <div className="flex justify-end px-6 w-full">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors "
            >
              <span>پیشنهادهای بیشتر</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-extrabold mb-4">چطور می‌توانم کمک کنم؟</p>

          {/* Categories Swiper */}
          <Swiper
            modules={[FreeMode]}
            spaceBetween={12}
            slidesPerView="auto"
            freeMode={true}
            className="mb-6"
          >
            {promptCategories.map((category) => (
              <SwiperSlide key={category.id} style={{ width: "auto" }}>
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? "bg-red-500 text-red-500-foreground text-white dark:text-black shadow-md"
                      : "border text-muted-foreground hover:border-muted/80"
                  }`}
                >
                  {category.name}
                </button>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 gap-3">
            {currentCategory?.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt?.(prompt.text)}
                className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent/50 transition-all bg-muted/70 hover:shadow-md text-right group"
              >
                <span className="text-2xl shrink-0">{prompt.emoji}</span>
                <span className="flex-1 text-sm text-foreground">
                  {prompt.text}
                </span>
                <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PromptSuggestions;
