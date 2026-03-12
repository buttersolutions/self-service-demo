"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface InlineSectionLoaderProps {
  searchText: string;
  children: React.ReactNode;
  height?: number;
}

function TypewriterMini({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[1.5px] h-3 bg-foreground ml-px align-middle"
        />
      )}
    </span>
  );
}

export function InlineSectionLoader({
  searchText,
  children,
  height = 200,
}: InlineSectionLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden border border-border/60 bg-white relative"
      style={{ height }}
    >
      {/* Scaled animation content */}
      <div
        className="w-[200%] h-[200%] origin-top-left"
        style={{ transform: "scale(0.5)" }}
      >
        {children}
      </div>

      {/* Shimmer overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-[60%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 60%, transparent 100%)",
          }}
          initial={{ left: "-60%" }}
          animate={{ left: "160%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0.5,
          }}
        />
      </div>

      {/* Centered search bar */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-border/50 flex items-center gap-2.5 pointer-events-auto">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-foreground">
            <TypewriterMini text={searchText} />
          </span>
        </div>
      </div>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[1.5px] z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.4) 30%, rgba(98, 92, 228, 0.7) 50%, rgba(98, 92, 228, 0.4) 70%, transparent 100%)",
        }}
        initial={{ top: 0, opacity: 0 }}
        animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
