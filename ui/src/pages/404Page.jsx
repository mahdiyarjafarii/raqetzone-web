import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import notFound from "@/assets/lottie/404.lottie";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <motion.p
          className="text-xl text-gray-500 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          به نظر میرسد که صفحه مورد نظر شما یافت نشد.
        </motion.p>

        <DotLottieReact src={notFound} loop autoplay className="mt-10 mb-5" />

        <Link to="/">
          <motion.button
            className="bg-primary hover:bg-primary/80 font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 text-white mt-12"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            بازگشت به صفحه اصلی
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
