/**
 * Screenshot Capture Component
 * Captures and manages screenshots for writing assistant
 */

import React, { useState, useRef, useCallback } from 'react';

interface Screenshot {
  id: string;
  dataUrl: string;
  timestamp: number;
  description?: string;
}

interface ScreenshotCaptureProps {
  onCapture?: (screenshot: Screenshot) => void;
  maxScreenshots?: number;
}

export function ScreenshotCapture({ onCapture, maxScreenshots = 10 }: ScreenshotCaptureProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      setIsCapturing(true);
    } catch (error) {
      console.error('Error starting screen capture:', error);
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    const screenshot: Screenshot = {
      id: crypto.randomUUID(),
      dataUrl,
      timestamp: Date.now(),
    };

    setScreenshots(prev => {
      const updated = [screenshot, ...prev];
      return updated.slice(0, maxScreenshots);
    });

    onCapture?.(screenshot);
  }, [maxScreenshots, onCapture]);

  const stopCapture = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  }, []);

  const deleteScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const downloadScreenshot = useCallback((screenshot: Screenshot) => {
    const link = document.createElement('a');
    link.href = screenshot.dataUrl;
    link.download = `screenshot-${screenshot.timestamp}.png`;
    link.click();
  }, []);

  return (
    <div className="screenshot-capture">
      <div className="mb-4">
        <button
          onClick={isCapturing ? stopCapture : startCapture}
          className={`px-4 py-2 rounded ${
            isCapturing
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors`}
        >
          {isCapturing ? 'Stop Capture' : 'Start Screen Capture'}
        </button>
      </div>

      {isCapturing && (
        <div className="mb-4">
          <video
            ref={videoRef}
            className="w-full border rounded"
            autoPlay
            muted
          />
          <button
            onClick={captureFrame}
            className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
          >
            📸 Capture Frame
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {screenshots.length > 0 && (
        <div className="screenshots-grid">
          <h3 className="font-semibold mb-2">Screenshots ({screenshots.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {screenshots.map(screenshot => (
              <div key={screenshot.id} className="relative group">
                <img
                  src={screenshot.dataUrl}
                  alt={`Screenshot ${screenshot.timestamp}`}
                  className="w-full border rounded"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => downloadScreenshot(screenshot)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                    title="Download"
                  >
                    ⬇
                  </button>
                  <button
                    onClick={() => deleteScreenshot(screenshot.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(screenshot.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Screenshot Gallery Component
 */
export function ScreenshotGallery() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);

  const handleCapture = (screenshot: Screenshot) => {
    setScreenshots(prev => [screenshot, ...prev]);
  };

  return (
    <div className="screenshot-gallery">
      <ScreenshotCapture onCapture={handleCapture} />
    </div>
  );
}

/**
 * OCR Text Extraction from Screenshot
 */
export async function extractTextFromScreenshot(screenshot: Screenshot): Promise<string> {
  // This would use Tesseract.js or similar OCR library
  // For now, return a placeholder
  return '[OCR text extraction would happen here]';
}

/**
 * Screenshot Annotation Component
 */
export function ScreenshotAnnotation({ screenshot }: { screenshot: Screenshot }) {
  const [annotations, setAnnotations] = useState<Array<{
    id: string;
    x: number;
    y: number;
    text: string;
  }>>([]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const text = prompt('Enter annotation:');
    if (text) {
      setAnnotations(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          x,
          y,
          text,
        },
      ]);
    }
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="relative">
      <img
        src={screenshot.dataUrl}
        alt="Screenshot with annotations"
        onClick={handleImageClick}
        className="w-full border rounded cursor-crosshair"
      />
      {annotations.map(annotation => (
        <div
          key={annotation.id}
          className="absolute bg-yellow-200 border border-yellow-400 px-2 py-1 rounded text-sm"
          style={{
            left: annotation.x,
            top: annotation.y,
          }}
          onClick={(e) => {
            e.stopPropagation();
            removeAnnotation(annotation.id);
          }}
        >
          {annotation.text}
        </div>
      ))}
    </div>
  );
}
