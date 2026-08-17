'use client';
import React, { useState, useEffect, useRef } from 'react';

interface ImageCropperModalProps {
  imageSrc: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropperModal({ imageSrc, onCrop, onCancel }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
    }
    // Lock body scrolling during active crop session to prevent viewport bouncing
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPan({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const size = 400; // Generate 400x400 high-quality optimized profile avatar
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill white background for JPEGs/transparent PNGs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate source rect coordinates mapped to cropped area
    // The visual viewport is 280px container, cutout is 240px.
    // Scale factor from visual display to output 400x400
    const scale = size / 240; 
    
    // Width and height of image under zoom
    const visualWidth = img.naturalWidth * (240 / img.naturalHeight);
    const visualHeight = 240; 
    
    // Draw the image onto canvas using the pan offsets scaled up
    const destWidth = visualWidth * zoom * scale;
    const destHeight = visualHeight * zoom * scale;
    const destX = (pan.x * scale) - (destWidth / 2);
    const destY = (pan.y * scale) - (destHeight / 2);

    ctx.drawImage(img, destX, destY, destWidth, destHeight);

    // Export as optimized JPEG/WebP (500KB or less)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          onCrop(croppedFile);
        }
      },
      'image/jpeg',
      0.88 // 88% quality is sweet spot for file size and clarity
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: 'white',
          width: '100%',
          maxWidth: '460px',
          height: isMobile ? '100dvh' : 'auto',
          borderRadius: isMobile ? '0' : '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid #E2E8F0',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
            Adjust Profile Picture
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#64748B'
            }}
          >
            ✕
          </button>
        </div>

        {/* Viewport crop box */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            background: '#0F172A',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '280px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none'
          }}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleDragStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleDragMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleDragEnd}
        >
          {/* Displayed Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="To Crop"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
              maxHeight: '240px',
              width: 'auto',
              objectFit: 'contain',
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          />

          {/* Vignette Overlay (Dark backdrop + transparent circular cutout) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 0 9999px rgba(15, 23, 42, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Cutout Ring Border */}
            <div
              style={{
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                border: '3px solid #3B82F6',
                boxShadow: '0 0 0 9999px transparent',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              background: 'rgba(15,23,42,0.6)',
              color: 'white',
              fontSize: '0.75rem',
              padding: '4px 12px',
              borderRadius: '999px',
              fontWeight: 600,
              pointerEvents: 'none'
            }}
          >
            ↔ Drag to position within circle
          </div>
        </div>

        {/* Controls Panel */}
        <div
          style={{
            padding: '20px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0
          }}
        >
          {/* Zoom Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              <span>🔍 Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '999px',
                accentColor: '#2563EB',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRotate}
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '10px 0',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🔄 Rotate 90°
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '10px 0',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🧹 Reset
            </button>
          </div>

          {/* Main action triggers */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid #CBD5E1',
                color: '#64748B',
                padding: '12px 0',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: 'white',
                border: 'none',
                padding: '12px 0',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.22)'
              }}
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
