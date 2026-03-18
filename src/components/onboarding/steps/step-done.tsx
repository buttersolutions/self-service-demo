'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function StepDone() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full max-w-[640px] mx-auto px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="size-20 rounded-full bg-[#625CE4] flex items-center justify-center mb-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Check className="size-10 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.h1
        className="text-[28px] font-medium text-gray-900 tracking-[-0.02em] font-serif"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        All done!
      </motion.h1>

      <motion.p
        className="text-[15px] text-gray-500 mt-3 leading-relaxed max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        We&apos;ve gathered everything we need. Your branded app is being prepared.
      </motion.p>
    </motion.div>
  );
}
