import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, A11y } from "swiper/modules";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "lucide-react";
import "swiper/css";
import "swiper/css/pagination";

function FullscreenViewer({ images, startIndex, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
      >
        <XIcon className="w-5 h-5 text-white" />
      </button>

      <Swiper
        modules={[Pagination, A11y]}
        initialSlide={startIndex}
        pagination={{ clickable: true, bulletActiveClass: "!bg-white !opacity-100 !w-5", bulletClass: "swiper-pagination-bullet !bg-white/50 !opacity-100 !h-1.5 !w-1.5 !rounded-full !transition-all" }}
        className="w-full h-full [&_.swiper-pagination]:!bottom-6"
        spaceBetween={0}
        slidesPerView={1}
      >
        {images.map((src, i) => (
          <SwiperSlide key={i} className="flex items-center justify-center">
            <img src={imgUrl(src)} alt="" className="max-w-full max-h-full object-contain" />
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}

const BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";
const imgUrl = (src) => src?.startsWith("http") ? src : `${BASE}${src}`;

export default function ClubGallery({ images = [], clubName }) {
  const [viewerIndex, setViewerIndex] = useState(null);

  if (!images.length) return null;

  const mainImage = images[0];
  const thumbs = images.slice(1, 5);

  return (
    <>
      <div className="relative">
        {/* Mobile: full-width swiper */}
        <div className="block">
          <Swiper
            modules={[Pagination]}
            pagination={{
              clickable: true,
              bulletActiveClass: "!bg-white !opacity-100 !w-4",
              bulletClass: "swiper-pagination-bullet !bg-white/60 !opacity-100 !h-1.5 !w-1.5 !rounded-full !transition-all mx-0.5",
            }}
            className="h-72 [&_.swiper-pagination]:!bottom-3"
            spaceBetween={0}
            slidesPerView={1}
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <button
                  className="w-full h-full block"
                  onClick={() => setViewerIndex(i)}
                >
                  <img
                    src={imgUrl(src)}
                    alt={`${clubName} ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Image count badge */}
          <div className="absolute bottom-3 left-3 z-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-medium">
            {images.length} عکس
          </div>
        </div>
      </div>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <FullscreenViewer
            images={images}
            startIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
