"use client";
import React, { useState, useEffect } from "react";
import UiverseButton from "./ui/UiverseButton";
import AppIcon from "./ui/AppIcon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("aharsetu_pwa_install_dismissed");
    if (dismissed) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Also check if on iOS Safari where beforeinstallprompt is not natively emitted
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari && !dismissed) {
      // Show iOS specific "Add to Home Screen" instructions
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS / manual guide fallback
      alert("📱 To install AharSetu on iOS: Tap the Share icon (square with arrow) and select 'Add to Home Screen'.");
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("aharsetu_pwa_install_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "20px",
        right: "20px",
        maxWidth: "460px",
        margin: "0 auto",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "#FFFFFF",
        padding: "16px 20px",
        borderRadius: "20px",
        boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        animation: "uiversePwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img
          src="/images/logo.png"
          alt="AharSetu App"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            objectFit: "contain",
            background: "#FFFFFF",
            padding: "4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#F8FAFC", letterSpacing: "-0.01em" }}>
            Install AharSetu App
          </div>
          <div style={{ fontSize: "0.78rem", color: "#94A3B8", marginTop: "2px", lineHeight: 1.3 }}>
            Add to home screen for lightning-fast 1-tap orders & instant kitchen alerts.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "#94A3B8",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 12px",
          }}
        >
          Maybe Later
        </button>
        <UiverseButton
          onClick={handleInstallClick}
          size="sm"
          variant="primary"
          leftIcon={<AppIcon name="create" size={14} color="#FFFFFF" />}
        >
          Install App
        </UiverseButton>
      </div>

      <style>{`
        @keyframes uiversePwaSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
