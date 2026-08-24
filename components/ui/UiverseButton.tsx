"use client";
import React from "react";

export interface UiverseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "success" | "danger" | "glass" | "secondary" | "outline" | "admin" | "login";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glow?: boolean;
}

export default function UiverseButton({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  glow = false,
  className = "",
  style = {},
  disabled,
  ...props
}: UiverseButtonProps) {
  const sizeStyles = {
    sm: { padding: "5px 12px", fontSize: "0.8rem", minHeight: "32px", borderRadius: "8px", fontWeight: 600 },
    md: { padding: "9px 18px", fontSize: "0.875rem", minHeight: "38px", borderRadius: "8px", fontWeight: 600 },
    lg: { padding: "12px 24px", fontSize: "0.95rem", minHeight: "46px", borderRadius: "10px", fontWeight: 700 },
  }[size];

  const variantStyles: { [key: string]: React.CSSProperties } = {
    primary: {
      background: "#2563EB",
      color: "#FFFFFF",
      border: "1px solid #1D4ED8",
      boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
    },
    login: {
      background: "#2563EB",
      color: "#FFFFFF",
      border: "1px solid #1D4ED8",
      boxShadow: "0 2px 4px rgba(37, 99, 235, 0.25)",
    },
    admin: {
      background: "#0F172A",
      color: "#FFFFFF",
      border: "1px solid #1E293B",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
    },
    success: {
      background: "#059669",
      color: "#FFFFFF",
      border: "1px solid #047857",
      boxShadow: "0 1px 2px rgba(5, 150, 105, 0.2)",
    },
    danger: {
      background: "#DC2626",
      color: "#FFFFFF",
      border: "1px solid #B91C1C",
      boxShadow: "0 1px 2px rgba(220, 38, 38, 0.2)",
    },
    secondary: {
      background: "#FFFFFF",
      color: "#334155",
      border: "1px solid #CBD5E1",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    outline: {
      background: "#FFFFFF",
      color: "#2563EB",
      border: "1px solid #93C5FD",
      boxShadow: "0 1px 2px rgba(37, 99, 235, 0.05)",
    },
    glass: {
      background: "#FFFFFF",
      color: "#1E293B",
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
  };

  const selectedVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`ahar-btn ahar-btn-${variant} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: (disabled || isLoading) ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        outline: "none",
        transition: "all 0.15s ease",
        lineHeight: 1.4,
        ...sizeStyles,
        ...selectedVariant,
        ...style,
      }}
    >
      {isLoading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              borderTopColor: "#ffffff",
              borderRadius: "50%",
              animation: "aharSpin 0.7s linear infinite",
              display: "inline-block",
            }}
          />
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span style={{ display: "inline-flex", alignItems: "center" }}>{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span style={{ display: "inline-flex", alignItems: "center" }}>{rightIcon}</span>}
        </>
      )}

      <style>{`
        .ahar-btn:hover:not(:disabled) {
          filter: brightness(0.96);
          transform: translateY(-1px);
        }
        .ahar-btn:active:not(:disabled) {
          transform: translateY(0);
          filter: brightness(0.92);
        }
        .ahar-btn-secondary:hover:not(:disabled),
        .ahar-btn-outline:hover:not(:disabled),
        .ahar-btn-glass:hover:not(:disabled) {
          background-color: #F8FAFC !important;
          border-color: #94A3B8 !important;
        }
        @keyframes aharSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
