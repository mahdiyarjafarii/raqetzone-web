import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Bot } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { LazyLoadImage } from "react-lazy-load-image-component";

import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/spinner";

import "swiper/css";
import "swiper/css/free-mode";
import "react-lazy-load-image-component/src/effects/blur.css";

function HumanCharacters() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setIsLoading(true);

    const { data, ok } = await apiClient.get("/gpts", {
      type: "people",
    });
    const idsToPrioritize = [
      "f1a9b2c3-0015-4d2a-9f11-ffffffffffff",
      "f1a9b2c3-0031-4d2a-9f11-aabb33445566",
      "0518dbae-41a9-4848-b598-92cedad991da",
      "f1a9b2c3-0012-4d2a-9f11-cccccccccccc",
      "4610d032-12c2-4fea-b2bb-63b13a576099",
      "f1a9b2c3-0027-4d2a-9f11-334488771100",
      "f1a9b2c3-0002-4d2a-9f11-222222222222",
      "f1a9b2c3-0016-4d2a-9f11-112233445566",
      "fc2217b6-8105-4753-9663-1c92e1db066f",
      "f1a9b2c3-0019-4d2a-9f11-445566778899",
    ];

    if (Array.isArray(data.gpts)) {
      data.gpts = [
        ...idsToPrioritize
          .map((id) => data.gpts.find((c) => c.id === id))
          .filter(Boolean),
        ...data.gpts.filter((c) => !idsToPrioritize.includes(c.id)),
      ];
    }

    setIsLoading(false);

    if (!ok) return toast.error(data?.message || "خطا در بارگذاری شخصیت ها");

    setCharacters(data.gpts || []);
  };

  const handleCharacterClick = (character) => {
    navigate("/chat/new", {
      state: {
        gpt: character,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (characters.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between w-full">
        <p className="text-lg font-extrabold text-primary">شخصیت‌ها</p>

        <div>
          <Link
            to="/characters"
            className="text-xs px-2 text-muted-foreground hover:text-primary transition-colors"
          >
            مشاهده همه{" "}
          </Link>
        </div>
      </div>

      <Swiper
        modules={[FreeMode]}
        spaceBetween={16}
        slidesPerView="auto"
        freeMode={true}
        dir="rtl"
        className="px-0!"
      >
        {characters.map((character) => (
          <SwiperSlide key={character.id} className="w-[180px]! py-4">
            <div
              onClick={() => handleCharacterClick(character)}
              className="group relative w-full cursor-pointer text-right"
            >
              {/* Card */}
              <div className="relative bg-secondary overflow-hidden rounded-2xl bg-linear-to-br from-card to-card/50 border border-primary/50 shadow-lg shadow-primary/10">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-linear-to-br from-primary/0 via-primary/0 to-primary/10" />

                {/* Image */}
                <div className="relative p-2 pb-0 aspect-square">
                  {character.image ? (
                    <LazyLoadImage
                      src={character.image}
                      alt={character.name}
                      className="w-full h-full object-cover rounded-xl"
                      effect="blur"
                      placeholderSrc="/img-placeholder.jpg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5">
                      <Bot className="w-16 h-16 text-primary" />
                    </div>
                  )}

                  {/* Sparkle Icon */}
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col p-4 pt-0 space-y-1">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {character.name}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground whitespace-break-spaces line-clamp-1"
                    dir="rtl"
                  >
                    {character.description}
                  </p>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HumanCharacters;
