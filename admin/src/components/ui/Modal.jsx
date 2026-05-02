import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className={cn("relative w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden", widths[size])}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <XIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
