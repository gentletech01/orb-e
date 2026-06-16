"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  active: boolean;
}

export function AudioWaveform({ active }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let cancelled = false;

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        function draw() {
          if (!canvas || !ctx) return;
          animationFrameId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = canvas.width / bufferLength;
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const barHeight = (value / 255) * canvas.height;
            ctx.fillStyle = "rgb(37, 99, 235)";
            ctx.fillRect(
              i * barWidth,
              canvas.height - barHeight,
              barWidth - 1,
              barHeight
            );
          }
        }

        draw();
      } catch {
        // Si el usuario ya dio permiso para SpeechRecognition pero no para
        // getUserMedia directo (o lo rechaza), simplemente no se muestra la onda.
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
      audioContext?.close();
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} width={240} height={60} className="rounded bg-gray-50" />;
}
