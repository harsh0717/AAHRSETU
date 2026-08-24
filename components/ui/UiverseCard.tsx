'use client';
import React from 'react';

interface UiverseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'kpi' | 'gradient';
  accentColor?: string;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export default function UiverseCard({
  children,
  variant = 'default',
  accentColor,
  glow = false,
  padding = 'md',
  className = '',
  style = {},
  ...props
}: UiverseCardProps) {
  const paddingMap = {
    none: '0px',
    sm: '14px 16px',
    md: '20px 24px',
    lg: '28px 32px',
  }[padding];

  const variantStyles: React.CSSProperties = {
    default: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      boxShadow: glow
        ? `0 10px 25px -5px ${accentColor ? `${accentColor}25` : 'rgba(0, 0, 0, 0.05)'}, 0 2px 6px rgba(0,0,0,0.02)`
        : '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    },
    elevated: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
    },
    kpi: {
      background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFC 100%)',
      border: '1px solid #E2E8F0',
      borderTop: accentColor ? `4px solid ${accentColor}` : '4px solid #2563EB',
      boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)',
    },
    gradient: {
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
      border: '1px solid #DBEAFE',
      boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.06)',
    },
  }[variant];

  return (
    <div
      {...props}
      className={`uiverse-card ${className}`}
      style={{
        borderRadius: '18px',
        padding: paddingMap,
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        ...variantStyles,
        ...style,
      }}
    >
      {children}
      <style jsx>{`
        .uiverse-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03);
          border-color: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
