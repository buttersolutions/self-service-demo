import type { Variants } from 'framer-motion';

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

/**
 * Direction-aware slide variants for step-to-step transitions.
 * Pass `custom={direction}` (1 = forward, -1 = back) from AnimatePresence.
 */
export const stepVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
    scale: 0.97,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: EASE,
      when: 'beforeChildren',
      staggerChildren: 0.07,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    scale: 0.97,
    transition: {
      duration: 0.35,
      ease: EASE,
    },
  }),
};

/** Fade-up variant for staggered children within a step. */
export const childVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE },
  },
};

/** Spring pop for logos / avatars. */
export const popVariants: Variants = {
  initial: { opacity: 0, scale: 0.6 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 22, delay: 0.1 },
  },
};
