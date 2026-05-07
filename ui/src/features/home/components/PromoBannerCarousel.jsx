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
    <div className="mx-4 h-40 rounded-2xl bg-muted animate-pulse" />
  );
}

export default function PromoBannerCarousel({ promotions = [], loading }) {
  const FALLBACK_PROMOS = [
    {
      id: "fallback-clubs",
      title: "رزرو زمین",
      subtitle: "مجموعه‌های برتر پادل، تنیس و اسکواش در تهران",
      badgeText: "جدید",
      emoji: "🏓",
      ctaText: "رزرو کن",
      ctaHref: "/clubs",
      gradientFrom: "#2B0FD9",
      gradientTo: "#6B3FFF",
    },
    {
      id: "fallback-booking",
      title: "بازی امشب",
      subtitle: "زمین‌های موجود برای امشب را ببین و همین الان رزرو کن",
      badgeText: "موجود",
      emoji: "🎾",
      ctaText: "مشاهده",
      ctaHref: "/mybooking",
      gradientFrom: "#059669",
      gradientTo: "#0891B2",
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
        spaceBetween={0}
        slidesPerView={1}
        loop={items.length > 1}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true, bulletActiveClass: "swiper-pagination-bullet-active !bg-white !opacity-100 !w-4", bulletClass: "swiper-pagination-bullet !h-1.5 !w-1.5 !rounded-full !bg-white/50 !opacity-100 !transition-all" }}
        className="rounded-3xl overflow-hidden shadow-sm [&_.swiper-pagination]:!bottom-3 [&_.swiper-pagination-bullet]:!mx-0.5"
      >
        {items.map((promo) => (
          <SwiperSlide key={promo.id}>
            <div
              className="relative h-44 flex flex-col justify-between overflow-hidden px-5 pb-10 pt-5"
              style={{
                background: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientTo})`,
              }}
            >
              {/* Decorative circle */}
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-sm" />
              <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-md" />

              {/* Badge */}
              {promo.badgeText && (
                <span className="self-start bg-white/15 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider z-10">
                  {promo.badgeText}
                </span>
              )}

              {/* Content */}
              <div className="z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight">
                      {promo.emoji && <span className="mr-1">{promo.emoji}</span>}
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p className="text-white/80 text-xs mt-1.5 leading-relaxed max-w-[210px]">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  <Link
                    to={promo.ctaHref}
                    className="shrink-0 flex items-center gap-1 bg-white/95 backdrop-blur text-gray-900 text-xs font-bold px-3 py-2 rounded-full shadow-sm active:scale-95 transition-transform ml-2"
                  >
                    {promo.ctaText}
                    <ArrowLeftIcon className="w-3 h-3" />
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
