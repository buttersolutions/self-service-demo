"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface CountUpProps {
  to: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  to,
  duration = 1.5,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const [started, setStarted] = useState(false);
  const springValue = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(springValue, (v) => {
    return `${prefix}${v.toFixed(decimals)}${suffix}`;
  });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
      springValue.set(to);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [to, delay, springValue]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
}
