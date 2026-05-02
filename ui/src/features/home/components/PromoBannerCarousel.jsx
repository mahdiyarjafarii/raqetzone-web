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
  if (loading) return <SkeletonBanner />;
  if (!promotions.length) return null;

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
        loop={promotions.length > 1}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true, bulletActiveClass: "swiper-pagination-bullet-active !bg-white !opacity-100", bulletClass: "swiper-pagination-bullet !bg-white/50 !opacity-100" }}
        className="rounded-2xl overflow-hidden"
      >
        {promotions.map((promo) => (
          <SwiperSlide key={promo.id}>
            <div
              className="relative h-40 flex flex-col justify-between p-5 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientTo})`,
              }}
            >
              {/* Decorative circle */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -right-2 top-8 h-16 w-16 rounded-full bg-white/5" />

              {/* Badge */}
              {promo.badgeText && (
                <span className="self-start bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30 uppercase tracking-wider z-10">
                  {promo.badgeText}
                </span>
              )}

              {/* Content */}
              <div className="z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight drop-shadow">
                      {promo.emoji && <span className="mr-1">{promo.emoji}</span>}
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p className="text-white/75 text-xs mt-1 leading-relaxed max-w-[200px]">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  <Link
                    to={promo.ctaHref}
                    className="shrink-0 flex items-center gap-1 bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform ml-2"
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
