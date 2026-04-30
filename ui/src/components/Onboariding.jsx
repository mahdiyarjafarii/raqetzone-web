import React, { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import img1 from "@/assets/img/onboarding/1.png";
import img2 from "@/assets/img/onboarding/2.png";
import img3 from "@/assets/img/onboarding/3.png";
import img4 from "@/assets/img/onboarding/4.png";
import imgBtn1 from "@/assets/img/onboarding/Buttons/1.png";
import imgBtn2 from "@/assets/img/onboarding/Buttons/2.png";
import imgBtn3 from "@/assets/img/onboarding/Buttons/3.png";
import imgBtn4 from "@/assets/img/onboarding/Buttons/4.png";
import "swiper/css";
import "swiper/css/pagination";

const slides = [
  {
    image: img1,
    mainTitle: "Raqet Zone",
    title: "باشگاه پدل در جیب شما",
    description:
      "زمین‌های پدل را ببین، سانس مناسب را انتخاب کن و خیلی سریع رزروت را انجام بده.",
    btnImage: imgBtn1,
    btnText: "شروع رزرو",
    href: "/",
  },
  {
    image: img2,
    title: "پیدا کردن هم‌تیمی و حریف",
    description:
      "سطح بازی، زمان‌های آزاد و شهر را مشخص کن تا هم‌تیمی یا حریف مناسب را پیدا کنی و بازی هماهنگ کنید.",
    btnImage: imgBtn2,
    btnText: "پیدا کردن هم‌تیمی",
    href: "/tournament",
  },
  {
    image: img3,
    title: "تورنومنت‌ها و رقابت‌ها",
    description:
      "تورنومنت‌های فعال را دنبال کن، ثبت‌نام کن و از نتایج و برنامه بازی‌ها باخبر شو.",
    btnImage: imgBtn3,
    btnText: "دیدن تورنومنت‌ها",
    href: "/tournament",
  },
  {
    image: img4,
    title: "پروفایل و مدیریت بازی‌ها",
    description:
      "اطلاعات بازیکن، سطح بازی و تاریخچه رزروها را یکجا مدیریت کن تا هماهنگی‌ها راحت‌تر شود.",
    btnImage: imgBtn4,
    btnText: "رفتن به پروفایل",
    href: "/profile",
  },
];

const Onboarding = ({ setShowOnboarding }) => {
  const swiperRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const navigate = useNavigate();

  const handleComplete = (href) => {
    navigate(href);
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col h-full w-full max-w-screen md:max-w-120! mx-auto">
      {/* Progress Indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pb-2"
        dir="ltr"
      >
        <div className="flex gap-2 flex-row">
          {slides.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 rounded-full overflow-hidden bg-muted-foreground/30"
            >
              <motion.div
                key={index === activeIndex ? `active-${activeIndex}` : index}
                className="h-full rounded-full"
                initial={{
                  width: index < activeIndex ? "100%" : "0%",
                  backgroundColor: index < activeIndex ? "#3b82f6" : "#93c5fd",
                }}
                animate={{
                  width: index <= activeIndex ? "100%" : "0%",
                  backgroundColor: index <= activeIndex ? "#3b82f6" : "#93c5fd",
                }}
                transition={{
                  width: {
                    duration: index === activeIndex ? 6 : 0.3,
                    ease: index === activeIndex ? "linear" : "easeOut",
                  },
                  backgroundColor: {
                    duration: index === activeIndex ? 6 : 0.3,
                    ease: "linear",
                  },
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <Swiper
        dir="ltr"
        ref={swiperRef}
        modules={[Autoplay]}
        autoplay={{
          delay: 6000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        loop={true}
        speed={600}
        className="flex-1 w-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="h-full w-full flex flex-col cursor-pointer">
              <div
                className="absolute top-0 left-0 right-1/2 bottom-24 z-10"
                onClick={() => {
                  if (activeIndex > 0) {
                    swiperRef.current?.swiper?.slidePrev();
                  }
                }}
              ></div>
              <div
                className="absolute top-0 left-1/2 right-0 bottom-24 z-10"
                onClick={() => swiperRef.current?.swiper?.slideNext()}
              ></div>
              {/* Image Container */}
              <div className="flex-1 relative overflow-hidden">
                <motion.img
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full"
                />
                {/* Gradient overlay */}
                <div className="absolute" />
              </div>

              {/* Text Content */}
              <div
                dir="rtl"
                className="absolute top-20 left-0 right-0 px-6 text-center"
              >
                {slide.mainTitle && (
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-2xl font-bold text-black mb-3"
                  >
                    {slide.mainTitle}
                  </motion.h2>
                )}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-2xl font-bold text-black mb-3"
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-gray-800 text-base"
                >
                  {slide.description}
                </motion.p>
              </div>
              <div className="absolute bottom-10 flex justify-center items-center left-0 right-0 px-6 text-center">
                <button
                  onClick={() => {
                    handleComplete(slide.href);
                  }}
                  className="h-[60px] w-[228px] rounded-full bg-primary text-primary-foreground font-bold"
                >
                  {slide.btnText}
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Onboarding;
