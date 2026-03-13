'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface TypewriterSearchProps {
  text: string;
  typingSpeed?: number;
}

export function TypewriterSearch({ text, typingSpeed = 40 }: TypewriterSearchProps) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;

    const interval = setInterval(() => {
      i += 1;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
      } else {
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, typingSpeed]);

  return (
    <motion.div
      className="flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200 px-4 py-3 shadow-xs w-full max-w-[500px] mx-auto"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Search className="size-4 text-[#625CE4] shrink-0" />
      <span className="text-[14px] text-gray-600 truncate">{displayed}</span>
      <motion.span
        className="w-[2px] h-4 bg-[#625CE4] rounded-full shrink-0"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}
