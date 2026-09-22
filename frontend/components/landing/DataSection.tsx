'use client';

import { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { Database, LocateFixed, Compass } from 'lucide-react';

const cards = [
  {
    icon: <Database size={24} />,
    title: 'INCOIS Model',
    items: ['NetCDF Format', 'Temperature & Salinity', 'Currents (U, V)'],
    badge: 'Depth × Time × Location',
  },
  {
    icon: <LocateFixed size={24} />,
    title: 'Argo Floats',
    items: ['Vertical Profiles', 'Temperature & Salinity', 'Pressure / Position'],
    badge: 'Quality Flags Included',
  },
  {
    icon: <Compass size={24} />,
    title: 'Gliders',
    items: ['Trajectory Data', 'Depth Profiles', 'Temperature & Salinity'],
    badge: 'BGC Variables',
  },
];

export function DataSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.05 });

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.15 } },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section id="data" className="py-32 px-6 border-t border-thermocline/10 bg-deep-panel/20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 tracking-tighter">
            Built for real ocean data
          </h2>
          <p className="text-foam-dim text-lg max-w-2xl">
            Modular architecture allows additional observation platforms and model variables to be integrated without rebuilding the visualization layer.
          </p>
        </div>

        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="grid md:grid-cols-3 gap-8"
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={item}
              className="bg-abyss/80 backdrop-blur-md border border-thermocline/20 p-8 rounded-xl hover:border-biolume/40 transition-all hover:shadow-[0_0_30px_rgba(76,224,210,0.07)] group"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg bg-deep-panel border border-thermocline/40 flex items-center justify-center text-foam group-hover:text-biolume group-hover:border-biolume/40 transition-all">
                  {card.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-white">{card.title}</h3>
              </div>
              <ul className="font-mono text-sm text-foam-dim space-y-3">
                {card.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-thermocline/60 shrink-0" />
                    {item}
                  </li>
                ))}
                <li className="text-biolume pt-4 mt-4 border-t border-thermocline/10 uppercase tracking-widest font-semibold text-xs">
                  {card.badge}
                </li>
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
