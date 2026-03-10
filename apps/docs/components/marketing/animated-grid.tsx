'use client';
import React from 'react';
import { useInView } from '@/hooks/use-in-view';

const delayClasses: Record<number, string> = {
  0: 'animation-delay-0',
  1: 'animation-delay-100',
  2: 'animation-delay-200',
  3: 'animation-delay-300',
  4: 'animation-delay-400',
  5: 'animation-delay-500',
};

interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGrid({ children, className }: AnimatedGridProps) {
  const { ref, inView } = useInView();
  const items = React.Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className={inView ? `animate-fade-in-up ${delayClasses[i] ?? 'animation-delay-500'}` : 'opacity-0'}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
