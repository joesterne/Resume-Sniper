import React from 'react';
import { ChevronRight } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-2 text-[11px] font-bold uppercase transition-all border-b border-grid text-left ${
        active 
          ? 'bg-ink text-bg' 
          : 'text-ink/60 hover:text-ink hover:bg-accent/40'
      }`}
    >
      <span className={active ? 'text-bg' : 'text-ink/30'}>{icon}</span>
      <span className="tracking-tighter">{label}</span>
      {active && <ChevronRight size={10} className="ml-auto opacity-40" />}
    </button>
  );
}
