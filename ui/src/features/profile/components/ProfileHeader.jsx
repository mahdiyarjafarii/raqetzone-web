import React, { useRef } from "react";
import { motion } from "framer-motion";
import { CameraIcon, MapPinIcon, EditIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import useAuth from "@/auth/useAuth";

const SKILL_CONFIG = {
  beginner:     { label: "مبتدی",       color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  intermediate: { label: "متوسط",       color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  advanced:     { label: "پیشرفته",     color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  pro:          { label: "حرفه‌ای",     color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
};

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

export default function ProfileHeader({ user, rank, onEditClick, onImageUpload }) {
  const { getUserImage } = useAuth();
  const fileRef = useRef(null);
  const skill = SKILL_CONFIG[user?.skillLevel] ?? SKILL_CONFIG.beginner;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImageUpload(file);
  };

  return (
    <div className="relative px-4 pt-5 pb-4">
      {/* Rank gradient backdrop */}
      <div
        className="absolute inset-x-0 top-0 h-28 opacity-10 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${rank?.gradient?.[0] ?? "#2B0FD9"}, ${rank?.gradient?.[1] ?? "#7C3AED"})`,
        }}
      />

      <div className="relative flex items-end gap-4">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="relative shrink-0"
        >
          <div
            className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-border shadow-md"
            style={{ boxShadow: `0 0 0 3px ${rank?.color ?? "#2B0FD9"}30` }}
          >
            <img
              src={getUserImage(user?.image)}
              alt={user?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
          >
            <CameraIcon className="w-3 h-3" />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff" className="hidden" onChange={handleFileChange} />
        </motion.div>

        {/* Name + info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 min-w-0 pb-1"
        >
          <div className="flex items-center gap-2">
            <h1 className="font-black text-xl text-foreground truncate">
              {user?.name ?? user?.phone ?? "بازیکن"}
            </h1>
            <button onClick={onEditClick} className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors">
              <EditIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            <span className={cn("text-xs px-2.5 py-0.5 rounded-full border font-semibold", skill.color)}>
              {skill.label}
            </span>
            {user?.favoriteSport && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {SPORT_ICONS[user.favoriteSport] ?? "🏅"}
                {user.favoriteSport}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPinIcon className="w-3 h-3" />
              تهران
            </span>
          </div>

          {user?.bio && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              {user.bio}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
