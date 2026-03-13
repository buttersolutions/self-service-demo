'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';

function darkenColor(hex: string, percent: number): string {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color.split('').map((c) => c + c).join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

interface FolderProps {
  color?: string;
  size?: number;
  items?: (ReactNode | null)[];
  open?: boolean;
  onToggle?: () => void;
}

// Open positions for the 3 papers
const PAPER_OPEN = [
  { x: '-120%', y: '-70%', rotate: -15 },
  { x: '10%', y: '-70%', rotate: 15 },
  { x: '-50%', y: '-100%', rotate: 5 },
];

const PAPER_CLOSED = [
  { x: '-50%', y: '10%', rotate: 0 },
  { x: '-50%', y: '10%', rotate: 0 },
  { x: '-50%', y: '10%', rotate: 0 },
];

export function Folder({
  color = '#625CE4',
  size = 1,
  items = [],
  open: controlledOpen,
  onToggle,
}: FolderProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const maxItems = 3;
  const papers = items.slice(0, maxItems);
  while (papers.length < maxItems) {
    papers.push(null);
  }

  const folderBackColor = darkenColor(color, 0.08);
  const paperColors = [darkenColor('#ffffff', 0.1), darkenColor('#ffffff', 0.05), '#ffffff'];

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div style={{ transform: `scale(${size})` }}>
      <motion.div
        className="cursor-pointer relative"
        onClick={handleClick}
        animate={{ y: isOpen ? -8 : 0 }}
        whileHover={{ y: -8 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {/* Folder back */}
        <div
          className="relative rounded-[0_10px_10px_10px]"
          style={{
            width: 100,
            height: 80,
            backgroundColor: folderBackColor,
          }}
        >
          {/* Tab */}
          <div
            className="absolute bottom-[98%] left-0 rounded-t-[5px]"
            style={{
              width: 30,
              height: 10,
              backgroundColor: folderBackColor,
            }}
          />

          {/* Papers */}
          {papers.map((item, i) => {
            const target = isOpen ? PAPER_OPEN[i] : PAPER_CLOSED[i];
            const widths = ['70%', '80%', '90%'];
            const heights = ['80%', '70%', '60%'];

            return (
              <motion.div
                key={i}
                className="absolute rounded-[10px] overflow-hidden"
                style={{
                  zIndex: 2,
                  bottom: '10%',
                  left: '50%',
                  width: widths[i],
                  height: heights[i],
                  backgroundColor: paperColors[i],
                }}
                animate={{
                  x: target.x,
                  y: target.y,
                  rotate: target.rotate,
                }}
                whileHover={isOpen ? { scale: 1.1 } : {}}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                }}
              >
                {item && (
                  <div className="w-full h-full overflow-hidden">
                    {item}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Folder front — left side */}
          <motion.div
            className="absolute rounded-[5px_10px_10px_10px]"
            style={{
              zIndex: 3,
              width: '100%',
              height: '100%',
              backgroundColor: color,
              transformOrigin: 'bottom',
            }}
            animate={{
              skewX: isOpen ? 15 : 0,
              scaleY: isOpen ? 0.6 : 1,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />

          {/* Folder front — right side */}
          <motion.div
            className="absolute rounded-[5px_10px_10px_10px]"
            style={{
              zIndex: 3,
              width: '100%',
              height: '100%',
              backgroundColor: color,
              transformOrigin: 'bottom',
            }}
            animate={{
              skewX: isOpen ? -15 : 0,
              scaleY: isOpen ? 0.6 : 1,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
