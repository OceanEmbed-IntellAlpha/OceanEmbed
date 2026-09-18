import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  activeColor?: string; // e.g., 'bg-biolume'
}

export function Switch({ checked, onChange, className = '', activeColor = 'bg-biolume' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-transparent 
        transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-biolume/50 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-panel
        ${checked ? `${activeColor} shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]` : 'bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border-white/5'}
        ${className}
      `}
    >
      <span className="sr-only">Toggle</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
          ${checked ? 'translate-x-4' : 'translate-x-[1px]'}
        `}
      />
    </button>
  );
}
