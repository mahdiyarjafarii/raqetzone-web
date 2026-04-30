import { FileIcon, InfoIcon, Download } from "lucide-react";
import downloader from "@/lib/downloader";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import "swiper/css";
import "swiper/css/free-mode";
import "react-lazy-load-image-component/src/effects/blur.css";

export const Message = ({ className, from, ...props }) => (
  <div
    className={cn(
      "group flex w-full items-end justify-end gap-2 pb-4",
      from === "user" ? "is-user" : "is-assistant flex-row-reverse justify-end",
      "[&>div]:max-w-full",
      className
    )}
    {...props}
  />
);

export const MessageContent = ({ children, className, ...props }) => (
  <div
    className={cn(
      "flex flex-col gap-2 rounded-lg text-sm text-foreground px-4 py-3 overflow-hidden",
      "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
      "group-[.is-assistant]:bg-secondary group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
);

export const MessageAvatar = ({ src, name, className, ...props }) => (
  <Avatar className={cn("size-8 ring-1 ring-border", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);

export const MessageAttachments = ({ attachments = [], className, from }) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((att) => att.type === "image");
  const files = attachments.filter((att) => att.type === "file");

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {images.length > 0 && (
        <div className="w-full">
          {images.length === 1 ? (
            <div>
              <div className="relative">
                <LazyLoadImage
                  src={images[0].url}
                  alt={images[0].name}
                  effect="blur"
                  placeholderSrc="/img-placeholder.jpg"
                  className="rounded-lg w-full h-auto object-cover"
                  wrapperClassName="w-full"
                />
                <button
                  onClick={() => downloader(images[0].url, images[0].name)}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  aria-label="Download image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {from === "assistant" && (
                <div className="p-2 bg-gray-500/10 rounded-lg flex items-center gap-2 max-w-3/4 mx-auto">
                  <InfoIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <p className="text-sm text-gray-500">
                    برای تولید عکس‌های حرفه‌ای با ابعاد و استایل‌های متفاوت‌تر
                    از
                    <Link
                      to="/image-generate"
                      className="text-blue-500 hover:underline"
                    >
                      {" "}
                      بخش تصویر{" "}
                    </Link>
                    از طریق منوی پایین صفحه‌ی اصلی استفاده کنید‌
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Swiper
              modules={[FreeMode]}
              spaceBetween={8}
              slidesPerView={3.5}
              freeMode={true}
              dir="rtl"
              className="rounded-lg"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index}>
                  <div className="relative">
                    <LazyLoadImage
                      src={image.url}
                      alt={image.name}
                      effect="blur"
                      className="rounded-lg w-full h-24 object-cover"
                      wrapperClassName="w-full h-24"
                    />
                    <button
                      onClick={() => downloader(image.url, image.name)}
                      className="absolute top-1 right-1 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                      aria-label="Download image"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {files.map((file, index) => (
            <Badge key={index} variant="default">
              <FileIcon className="w-3 h-3" />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[150px] truncate hover:underline"
              >
                {file.name}
              </a>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
