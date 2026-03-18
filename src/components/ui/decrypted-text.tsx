"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  onComplete?: () => void;
  animateOn?: "view" | "mount";
  delay?: number;
}

export function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = "start",
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*",
  className = "",
  encryptedClassName = "",
  onComplete,
  animateOn = "mount",
  delay = 0,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const availableChars = useMemo(() => characters.split(""), [characters]);

  const shuffleText = useCallback(
    (originalText: string, currentRevealed: Set<number>) => {
      return originalText
        .split("")
        .map((char, i) => {
          if (char === " ") return " ";
          if (currentRevealed.has(i)) return originalText[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)];
        })
        .join("");
    },
    [availableChars]
  );

  // Start animation after delay
  useEffect(() => {
    if (hasStarted) return;

    if (animateOn === "mount") {
      const timer = setTimeout(() => {
        setHasStarted(true);
        setRevealedIndices(new Set());
        setDisplayText(shuffleText(text, new Set()));
        setIsAnimating(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (animateOn === "view") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasStarted) {
              setTimeout(() => {
                setHasStarted(true);
                setRevealedIndices(new Set());
                setDisplayText(shuffleText(text, new Set()));
                setIsAnimating(true);
              }, delay);
            }
          });
        },
        { threshold: 0.1 }
      );
      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [animateOn, delay, hasStarted, text, shuffleText]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    let currentIteration = 0;

    const getNextIndex = (revealedSet: Set<number>) => {
      const len = text.length;
      if (revealDirection === "start") return revealedSet.size;
      if (revealDirection === "end") return len - 1 - revealedSet.size;
      // center
      const middle = Math.floor(len / 2);
      const offset = Math.floor(revealedSet.size / 2);
      return revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;
    };

    const interval = setInterval(() => {
      setRevealedIndices((prev) => {
        if (sequential) {
          if (prev.size < text.length) {
            const nextIndex = getNextIndex(prev);
            const next = new Set(prev);
            next.add(nextIndex);
            setDisplayText(shuffleText(text, next));
            return next;
          } else {
            clearInterval(interval);
            setIsAnimating(false);
            setDisplayText(text);
            onComplete?.();
            return prev;
          }
        } else {
          setDisplayText(shuffleText(text, prev));
          currentIteration++;
          if (currentIteration >= maxIterations) {
            clearInterval(interval);
            setIsAnimating(false);
            setDisplayText(text);
            onComplete?.();
          }
          return prev;
        }
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isAnimating, text, speed, maxIterations, sequential, revealDirection, shuffleText, onComplete]);

  return (
    <motion.span
      ref={containerRef}
      className="inline-block whitespace-pre-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
    >
      {displayText.split("").map((char, index) => {
        const isRevealed = revealedIndices.has(index) || !isAnimating;
        return (
          <span
            key={index}
            className={isRevealed ? className : encryptedClassName || "opacity-60"}
          >
            {char}
          </span>
        );
      })}
    </motion.span>
  );
}
