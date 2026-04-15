'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TrialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  buttonText: string;
}

export function TrialDialog({ isOpen, onClose, title, description, buttonText }: TrialDialogProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartTrial = () => {
    window.open('https://demo.hotcrm.com', '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-dialog-title"
    >
      <div className="relative w-full max-w-md mx-4 bg-background rounded-lg shadow-xl border border-border">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h2 id="trial-dialog-title" className="text-2xl font-bold mb-3">
            {title}
          </h2>
          <p className="text-muted-foreground mb-6">
            {description}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartTrial}
              className="w-full inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {buttonText}
            </button>
            <button
              onClick={onClose}
              className="w-full inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              取消 / Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
