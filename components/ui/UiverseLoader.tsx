"use client";
import React from "react";

export interface UiverseLoaderProps {
  variant?: "ring" | "dots" | "cloche" | "fullscreen";
  size?: "sm" | "md" | "lg";
  color?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function UiverseLoader({
  variant = "ring",
  size = "md",
  color = "#2563EB",
  label,
  className = "",
  style = {},
}: UiverseLoaderProps) {
  const dimensions = {
    sm: { width: 24, height: 24, fontSize: "0.75rem" },
    md: { width: 44, height: 44, fontSize: "0.85rem" },
    lg: { width: 64, height: 64, fontSize: "0.98rem" },
  }[size];

  if (variant === "fullscreen") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          gap: "16px",
          ...style,
        }}
        className={className}
      >
        <div className="uiverse-cloche-loader">
          <div className="steam steam-1" />
          <div className="steam steam-2" />
          <div className="steam steam-3" />
          <div className="cloche-lid" />
          <div className="cloche-base" />
        </div>
        {label && (
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#0F388A",
              letterSpacing: "-0.01em",
              animation: "uiverseFadePulse 1.8s ease-in-out infinite",
            }}
          >
            {label}
          </div>
        )}
        <style>{`
          .uiverse-cloche-loader {
            position: relative;
            width: 60px;
            height: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
          }
          .steam {
            position: absolute;
            width: 4px;
            height: 14px;
            background: #EA580C;
            border-radius: 2px;
            top: 2px;
            opacity: 0;
            animation: uiverseSteam 1.6s ease-in-out infinite;
          }
          .steam-1 { left: 18px; animation-delay: 0s; }
          .steam-2 { left: 28px; animation-delay: 0.4s; }
          .steam-3 { left: 38px; animation-delay: 0.8s; }
          .cloche-lid {
            width: 44px;
            height: 22px;
            border-radius: 22px 22px 0 0;
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            position: relative;
          }
          .cloche-lid::after {
            content: "";
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #1E40AF;
          }
          .cloche-base {
            width: 54px;
            height: 4px;
            border-radius: 2px;
            background: #1E40AF;
            margin-top: 2px;
          }
          @keyframes uiverseSteam {
            0% { transform: translateY(6px); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateY(-10px); opacity: 0; }
          }
          @keyframes uiverseFadePulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: size === "sm" ? "4px" : "6px",
          ...style,
        }}
        className={className}
      >
        <span
          className="uiverse-dot uiverse-dot-1"
          style={{ width: dimensions.width * 0.25, height: dimensions.width * 0.25, background: color }}
        />
        <span
          className="uiverse-dot uiverse-dot-2"
          style={{ width: dimensions.width * 0.25, height: dimensions.width * 0.25, background: "#EA580C" }}
        />
        <span
          className="uiverse-dot uiverse-dot-3"
          style={{ width: dimensions.width * 0.25, height: dimensions.width * 0.25, background: color }}
        />
        {label && (
          <span style={{ fontSize: dimensions.fontSize, fontWeight: 700, color: "#64748B", marginLeft: "6px" }}>
            {label}
          </span>
        )}
        <style>{`
          .uiverse-dot {
            border-radius: 50%;
            display: inline-block;
            animation: uiverseDotBounce 1.2s infinite ease-in-out both;
          }
          .uiverse-dot-1 { animation-delay: -0.32s; }
          .uiverse-dot-2 { animation-delay: -0.16s; }
          @keyframes uiverseDotBounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (variant === "cloche") {
    return (
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          ...style,
        }}
        className={className}
      >
        <div className="uiverse-cloche-mini">
          <div className="steam steam-1" />
          <div className="steam steam-2" />
          <div className="cloche-lid" />
          <div className="cloche-base" />
        </div>
        {label && (
          <span style={{ fontSize: dimensions.fontSize, fontWeight: 700, color: "#475569" }}>
            {label}
          </span>
        )}
        <style>{`
          .uiverse-cloche-mini {
            position: relative;
            width: 36px;
            height: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
          }
          .uiverse-cloche-mini .steam {
            position: absolute;
            width: 3px;
            height: 10px;
            background: #EA580C;
            border-radius: 2px;
            top: 2px;
            opacity: 0;
            animation: uiverseSteam 1.4s ease-in-out infinite;
          }
          .uiverse-cloche-mini .steam-1 { left: 10px; animation-delay: 0s; }
          .uiverse-cloche-mini .steam-2 { left: 22px; animation-delay: 0.5s; }
          .uiverse-cloche-mini .cloche-lid {
            width: 28px;
            height: 14px;
            border-radius: 14px 14px 0 0;
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            position: relative;
          }
          .uiverse-cloche-mini .cloche-lid::after {
            content: "";
            position: absolute;
            top: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #1E40AF;
          }
          .uiverse-cloche-mini .cloche-base {
            width: 34px;
            height: 3px;
            border-radius: 2px;
            background: #1E40AF;
            margin-top: 1px;
          }
        `}</style>
      </div>
    );
  }

  // Default: "ring"
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: color,
            borderRightColor: "#EA580C",
            animation: "uiverseRingSpin 0.9s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite",
            filter: "drop-shadow(0 0 6px rgba(37,99,235,0.3))",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderBottomColor: color,
            animation: "uiverseRingSpinReverse 0.6s linear infinite",
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: dimensions.fontSize, fontWeight: 700, color: "#475569" }}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes uiverseRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes uiverseRingSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
