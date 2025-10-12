'use client';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * QRScanner
 * - Uses MediaDevices getUserMedia to access camera
 * - Decodes QR via jsQR each animation frame
 * - Calls onResult(text) when a QR code is detected
 */
export default function QRScanner({ onResult, paused = false }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    let rafId;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          scanFrame();
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。');
      }
    }

    function stopCamera() {
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    }

    function scanFrame() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const tick = () => {
        try {
          const video = videoRef.current;
          if (!video || paused) {
            rafId = requestAnimationFrame(tick);
            return;
          }
          if (video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              onResult?.(code.data);
            }
          }
        } catch (e) {
          // swallow frame errors
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', maxWidth: 480, borderRadius: 12, background: '#000' }}
      />
      {!ready && !error && <p>カメラを初期化中...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}
