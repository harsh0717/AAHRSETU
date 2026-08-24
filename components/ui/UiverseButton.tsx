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
  glow = true,
  className = "",
  style = {},
  disabled,
  ...props
}: UiverseButtonProps) {
  const sizeStyles = {
    sm: { padding: "8px 16px", fontSize: "0.8rem", height: "34px", borderRadius: "10px" },
    md: { padding: "12px 24px", fontSize: "0.92rem", height: "44px", borderRadius: "14px" },
    lg: { padding: "15px 32px", fontSize: "1.05rem", height: "52px", borderRadius: "16px" },
  }[size];

  const variantStyles = {
    primary: {
      background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1E40AF 100%)",
      color: "#FFFFFF",
      boxShadow: glow ? "0 4px 20px -2px rgba(37, 99, 235, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
    },
    admin: {
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      color: "#FFFFFF",
      boxShadow: glow ? "0 4px 18px rgba(15, 23, 42, 0.35)" : "none",
      border: "1px solid rgba(255, 255, 255, 0.12)",
    },
    login: {
      background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      color: "#FFFFFF",
      boxShadow: "0 8px 24px -4px rgba(37, 99, 235, 0.45)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    success: {
      background: "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)",
      color: "#FFFFFF",
      boxShadow: glow ? "0 4px 20px -2px rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    danger: {
      background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
      color: "#FFFFFF",
      boxShadow: glow ? "0 4px 20px -2px rgba(239, 68, 68, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    glass: {
      background: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "#1E293B",
      border: "1px solid rgba(226, 232, 240, 0.9)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    },
    outline: {
      background: "transparent",
      color: "#2563EB",
      border: "1.5px solid #2563EB",
      boxShadow: "none",
    },
    secondary: {
      background: "#F1F5F9",
      color: "#334155",
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
  }[variant] || {
    background: "#2563EB",
    color: "#FFFFFF",
    border: "none",
    boxShadow: "none",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`uiverse-btn ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        cursor: (disabled || isLoading) ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        outline: "none",
        overflow: "hidden",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: "translateY(0)",
        ...sizeStyles,
        ...variantStyles,
        ...style,
      }}
    >
      <span className="uiverse-shimmer" />

      {isLoading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span className="uiverse-spinner" />
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span style={{ display: "flex", alignItems: "center" }}>{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span style={{ display: "flex", alignItems: "center" }}>{rightIcon}</span>}
        </>
      )}

      <style>{`
        .uiverse-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.06);
        }
        .uiverse-btn:active:not(:disabled) {
          transform: translateY(1px);
          filter: brightness(0.95);
        }
        .uiverse-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          transition: 0.5s;
          pointer-events: none;
        }
        .uiverse-btn:hover .uiverse-shimmer {
          left: 100%;
          transition: 0.6s ease-in-out;
        }
        .uiverse-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: uiverseSpin 0.7s linear infinite;
        }
        @keyframes uiverseSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
