'use client';

import React from 'react';

interface Meteor {
  id: number;
  top: string;
  left: string;
  angle: number;       // degrees
  length: number;      // px
  duration: number;    // seconds active
  delay: number;       // seconds initial delay
  interval: number;    // seconds total cycle
  color: string;       // tail glow color
}

const METEORS: Meteor[] = [
  // Upper-left orbital sky
  { id: 1, top: '7%', left: '16%', angle: -36, length: 110, duration: 2.8, delay: 2.0, interval: 14, color: '#38bdf8' },
  // Upper-right deep space (crossing above horizon)
  { id: 2, top: '11%', left: '68%', angle: -42, length: 95, duration: 2.6, delay: 6.5, interval: 15, color: '#67e8f9' },
  // High central celestial space
  { id: 3, top: '4%', left: '44%', angle: -34, length: 125, duration: 3.0, delay: 10.5, interval: 17, color: '#e0f2fe' },
  // Mid-right orbital limb (above glider)
  { id: 4, top: '18%', left: '78%', angle: -39, length: 85, duration: 2.4, delay: 4.5, interval: 13, color: '#38bdf8' },
  // Mid-left cosmic horizon (above argo float)
  { id: 5, top: '14%', left: '26%', angle: -35, length: 100, duration: 2.8, delay: 13.0, interval: 16, color: '#bae6fd' },
];

export function FallingStars() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      <style jsx>{`
        @keyframes meteorStreak {
          0% {
            transform: rotate(var(--meteor-angle)) translate3d(0, 0, 0) scaleX(0);
            opacity: 0;
          }
          10% {
            transform: rotate(var(--meteor-angle)) translate3d(40px, 0, 0) scaleX(1);
            opacity: 0.85;
          }
          60% {
            transform: rotate(var(--meteor-angle)) translate3d(240px, 0, 0) scaleX(1);
            opacity: 0.75;
          }
          100% {
            transform: rotate(var(--meteor-angle)) translate3d(320px, 0, 0) scaleX(0.2);
            opacity: 0;
          }
        }
        .meteor-item {
          animation: meteorStreak var(--meteor-interval) ease-in-out infinite;
          animation-delay: var(--meteor-delay);
          opacity: 0;
        }
      `}</style>

      {METEORS.map((m) => (
        <div
          key={m.id}
          className="absolute"
          style={
            {
              top: m.top,
              left: m.left,
              '--meteor-angle': `${m.angle}deg`,
              '--meteor-interval': `${m.interval}s`,
              '--meteor-delay': `${m.delay}s`,
            } as React.CSSProperties
          }
        >
          <div
            className="meteor-item relative h-[1.5px] rounded-full"
            style={{
              width: `${m.length}px`,
              background: `linear-gradient(to right, rgba(0,0,0,0) 0%, ${m.color}55 50%, #ffffff 100%)`,
              boxShadow: `0 0 6px ${m.color}`,
            }}
          >
            {/* Luminous point head */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-white"
              style={{
                boxShadow: `0 0 6px 1px #ffffff, 0 0 12px 2px ${m.color}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
