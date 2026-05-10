import React from "react";
import { motion } from "framer-motion";
import { AMENITY_META } from "@/features/clubs/data/mockClubs";

export default function ClubAmenities({ amenities = [] }) {
  if (!amenities.length) return null;

  return (
    <div>
      <h2 className="font-bold text-foreground text-base mb-3">امکانات</h2>
      <div className="grid grid-cols-3 gap-2">
        {amenities.map((key, i) => {
          const meta = AMENITY_META[key];
          if (!meta) return null;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-1.5 bg-muted/60 rounded-xl p-3 text-center"
            >
              <span className="text-xl">{meta.icon}</span>
              <span className="text-xs text-muted-foreground font-medium leading-tight">{meta.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
