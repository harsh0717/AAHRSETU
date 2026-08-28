'use client';
import React from 'react';

interface UiverseBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'pulse';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function UiverseBadge({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className = '',
  style = {},
  ...props
}: UiverseBadgeProps) {
  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '0.72rem', borderRadius: '14px', gap: '4px' },
    md: { padding: '4px 12px', fontSize: '0.78rem', borderRadius: '20px', gap: '6px' },
  }[size];

  const variantStyles = {
    success: {
      background: 'rgba(16, 185, 129, 0.1)',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.25)',
      dotColor: '#10B981',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.1)',
      color: '#D97706',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      dotColor: '#F59E0B',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#DC2626',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      dotColor: '#EF4444',
    },
    info: {
      background: 'rgba(37, 99, 235, 0.1)',
      color: '#2563EB',
      border: '1px solid rgba(37, 99, 235, 0.25)',
      dotColor: '#3B82F6',
    },
    purple: {
      background: 'rgba(139, 92, 246, 0.1)',
      color: '#7C3AED',
      border: '1px solid rgba(139, 92, 246, 0.25)',
      dotColor: '#8B5CF6',
    },
    pulse: {
      background: 'rgba(16, 185, 129, 0.12)',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      dotColor: '#10B981',
    },
    neutral: {
      background: 'var(--surface-2)',
      color: 'var(--gray-600, #475569)',
      border: '1px solid var(--gray-200, #E2E8F0)',
      dotColor: '#94A3B8',
    },
  }[variant];

  return (
    <span
      {...props}
      className={`uiverse-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        ...sizeStyles,
        ...variantStyles,
        ...style,
      }}
    >
      {(pulse || variant === 'pulse') && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '7px',
            height: size === 'sm' ? '6px' : '7px',
            borderRadius: '50%',
            backgroundColor: variantStyles.dotColor,
            boxShadow: `0 0 0 0 ${variantStyles.dotColor}80`,
            animation: 'uiversePulse 2s infinite',
            flexShrink: 0,
          }}
        />
      )}
      <span>{children}</span>

      <style jsx>{`
        @keyframes uiversePulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </span>
  );
}
