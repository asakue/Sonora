import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-2xl ${hoverable ? 'glass-panel-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

