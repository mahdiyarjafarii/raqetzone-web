import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "lucide-react";
import "swiper/css";
import "swiper/css/pagination";

function SkeletonBanner() {
  return (
    <div className="mx-4 h-44 rounded-3xl bg-muted animate-pulse" />
  );
}

export default function PromoBannerCarousel({ promotions = [], loading }) {
  const FALLBACK_PROMOS = [
    {
      id: "fallback-clubs",
      eyebrow: "رزرو سریع",
      title: "زمین نزدیکت رو پیدا کن",
      subtitle: "بین مجموعه‌های برتر پدل، تنیس و اسکواش انتخاب کن و زمان مناسب رو رزرو کن.",
      badgeText: "پیشنهاد امروز",
      metric: "از ۳ دقیقه",
      emoji: "🏓",
      ctaText: "شروع رزرو",
      ctaHref: "/clubs",
      gradientFrom: "#24115F",
      gradientTo: "#6D28D9",
    },
    {
      id: "fallback-booking",
      eyebrow: "بازی دوستانه",
      title: "امشب تنها بازی نکن",
      subtitle: "بازی‌های باز رو ببین، تیم انتخاب کن و با بازیکن‌های نزدیکت هماهنگ شو.",
      badgeText: "جای خالی",
      metric: "تیم‌های فعال",
      emoji: "🎾",
      ctaText: "پیوستن",
      ctaHref: "/tournament",
      gradientFrom: "#047857",
      gradientTo: "#0891B2",
    },
    {
      id: "fallback-ai",
      eyebrow: "دستیار هوشمند",
      title: "برنامه بازی بهتر بچین",
      subtitle: "برای انتخاب زمین، زمان مناسب و پیشنهاد بازی از دستیار رکت‌زون کمک بگیر.",
      badgeText: "AI",
      metric: "پیشنهاد شخصی",
      emoji: "✨",
      ctaText: "باز کردن",
      ctaHref: "/ai",
      gradientFrom: "#BE185D",
      gradientTo: "#4338CA",
    },
  ];

  if (loading) return <SkeletonBanner />;
  const items = promotions.length ? promotions : FALLBACK_PROMOS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="px-4"
    >
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={12}
        slidesPerView={1}
        loop={items.length > 1}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true, bulletActiveClass: "swiper-pagination-bullet-active !bg-white !opacity-100 !w-4", bulletClass: "swiper-pagination-bullet !h-1.5 !w-1.5 !rounded-full !bg-white/50 !opacity-100 !transition-all" }}
        className="overflow-visible [&_.swiper-pagination]:!bottom-3 [&_.swiper-pagination-bullet]:!mx-0.5"
      >
        {items.map((promo) => (
          <SwiperSlide key={promo.id}>
            <div
              className="relative h-48 flex flex-col justify-between overflow-hidden rounded-[32px] px-5 pb-10 pt-5 shadow-xl shadow-slate-300/40 dark:shadow-black/20"
              style={{
                background: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientTo})`,
              }}
            >
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/12 blur-sm" />
              <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-white/8 blur-xl" />
              <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-white/8 blur-md" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/24 to-transparent" />
              <div className="absolute left-5 top-5 text-6xl opacity-20 rotate-[-12deg]">{promo.emoji}</div>

              {/* Badge */}
              {promo.badgeText && (
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="bg-white/15 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20">
                    {promo.badgeText}
                  </span>
                  {promo.metric && (
                    <span className="bg-black/12 backdrop-blur-md text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                      {promo.metric}
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="relative z-10">
                {promo.eyebrow && (
                  <p className="mb-1.5 text-[11px] font-black text-white/75 tracking-tight">{promo.eyebrow}</p>
                )}
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-white font-black text-[22px] leading-tight drop-shadow-sm max-w-[230px]">
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p className="text-white/85 text-xs mt-1.5 leading-relaxed max-w-[220px] font-medium">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  <Link
                    to={promo.ctaHref}
                    className="shrink-0 flex items-center gap-1 bg-white/95 backdrop-blur text-gray-900 text-xs font-black px-3.5 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform ml-2"
                  >
                    {promo.ctaText}
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
