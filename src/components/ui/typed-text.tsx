"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypedTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursorClassName?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

export function TypedText({
  text,
  speed = 40,
  delay = 0,
  className = "",
  cursorClassName = "",
  showCursor = true,
  onComplete,
}: TypedTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed, onComplete]);

  if (!started) return null;

  return (
    <span className={className}>
      {displayed}
      {showCursor && !done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className={`inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle ${cursorClassName}`}
        />
      )}
    </span>
  );
}
