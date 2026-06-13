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
              className="relative h-[236px] sm:h-[232px] overflow-hidden rounded-[30px] px-5 pb-8 pt-4 shadow-xl shadow-slate-300/40 dark:shadow-black/20"
              style={{
                background: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientTo})`,
              }}
            >
              <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10 blur-md" />
              <div className="absolute left-4 top-6 h-24 w-24 rounded-full bg-white/8 blur-xl" />
              <div className="absolute -left-8 bottom-5 h-24 w-24 rounded-full bg-black/10 blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-black/8 to-transparent" />
              <div className="absolute left-4 top-4 text-5xl opacity-15 rotate-[-12deg]">{promo.emoji}</div>

              {/* Badge */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                {promo.badgeText ? (
                  <span className="bg-white/14 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20">
                    {promo.badgeText}
                  </span>
                ) : <span />}
                {promo.metric ? (
                  <span className="bg-black/16 backdrop-blur-md text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/15">
                    {promo.metric}
                  </span>
                ) : null}
              </div>

              {/* Content */}
              <div className="relative z-10 mt-3 h-[calc(100%-34px)] flex flex-col">
                {promo.eyebrow && (
                  <p className="mb-1.5 text-[10px] font-black text-white/80 tracking-tight">{promo.eyebrow}</p>
                )}
                <h3 className="text-white font-black text-[20px] sm:text-[22px] leading-[1.2] drop-shadow-sm max-w-[92%] line-clamp-2">
                  {promo.title}
                </h3>
                {promo.subtitle && (
                  <p className="text-white/85 text-[12px] mt-1.5 leading-relaxed max-w-[92%] font-medium line-clamp-2">
                    {promo.subtitle}
                  </p>
                )}

                <Link
                  to={promo.ctaHref}
                  className="mt-auto w-fit inline-flex items-center gap-1 bg-white/95 backdrop-blur text-gray-900 text-xs font-black px-4 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  {promo.ctaText}
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
