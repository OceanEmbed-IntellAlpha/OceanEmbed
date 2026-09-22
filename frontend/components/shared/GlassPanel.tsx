import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  as?: React.ElementType;
  'aria-label'?: string;
  role?: string;
  id?: string;
}

/**
 * GlassPanel — the foundation for every floating HUD panel.
 * Translucent deep-panel fill, backdrop blur, subtle thermocline border.
 * Every other panel in the console composes from this.
 */
export function GlassPanel({
  children,
  className,
  strong = false,
  as: Tag = 'div',
  ...rest
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        'relative overflow-hidden tech-corners',
        'rounded-sm', // Sharper corners for a technical feel
        strong
          ? 'glass-panel-strong'
          : 'glass-panel',
        className
      )}
      {...rest}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </Tag>
  );
}
