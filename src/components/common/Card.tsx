import React from 'react';

interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  className?: string;
}

export function Card({ children, elevated = false, className = '' }: CardProps) {
  const classes = `${elevated ? 'card-elevated' : 'card'} ${className}`;

  return <div className={classes}>{children}</div>;
}
