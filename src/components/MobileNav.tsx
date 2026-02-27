'use client';

import { useState } from 'react';
import { Users, Activity, LayoutGrid, X } from 'lucide-react';

interface MobileNavProps {
  onShowAgents: () => void;
  onShowFeed: () => void;
  agentCount: number;
}

export function MobileNav({ onShowAgents, onShowFeed, agentCount }: MobileNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-mc-bg-secondary border-t border-mc-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        <button
          onClick={onShowAgents}
          className="flex flex-col items-center gap-1 px-4 py-2 text-mc-text-secondary hover:text-mc-accent transition-colors active:scale-95"
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {agentCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[10px] bg-mc-accent text-mc-bg rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {agentCount}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider">Agents</span>
        </button>

        <button
          onClick={onShowFeed}
          className="flex flex-col items-center gap-1 px-4 py-2 text-mc-text-secondary hover:text-mc-accent transition-colors active:scale-95"
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Feed</span>
        </button>
      </div>
    </div>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function MobileDrawer({ isOpen, onClose, title, children }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-mc-bg-secondary rounded-t-2xl border-t border-mc-border flex flex-col animate-slide-up">
        {/* Handle + Header */}
        <div className="flex items-center justify-between p-4 border-b border-mc-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-mc-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
            <span className="text-sm font-medium uppercase tracking-wider">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-mc-bg-tertiary text-mc-text-secondary hover:text-mc-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
