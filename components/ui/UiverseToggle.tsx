"use client";
import React from "react";

export interface UiverseToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  activeColor?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function UiverseToggle({
  checked,
  onChange,
  label,
  activeColor = "#10B981",
  size = "md",
  disabled = false,
}: UiverseToggleProps) {
  const isSm = size === "sm";
  const width = isSm ? 40 : 50;
  const height = isSm ? 22 : 28;
  const dotSize = isSm ? 16 : 20;
  const offset = checked ? (width - dotSize - 4) : 4;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${height}px`,
          background: checked ? activeColor : "#CBD5E1",
          position: "relative",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: checked
            ? `0 0 12px ${activeColor}55, inset 0 2px 4px rgba(0,0,0,0.15)`
            : "inset 0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "4px",
            left: `${offset}px`,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked && (
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: activeColor,
              }}
            />
          )}
        </div>
      </div>
      {label && (
        <span
          style={{
            fontSize: isSm ? "0.8rem" : "0.88rem",
            fontWeight: 600,
            color: checked ? "#0F172A" : "#64748B",
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
