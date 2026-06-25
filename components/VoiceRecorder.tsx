"use client";

import { useRef } from "react";
import { GeminiProvider } from "@/lib/transcription/geminiProvider";

interface VoiceRecorderProps {
  listening: boolean;
  onStart: () => void;
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <rect x="9" y="2" width="6" height="12" rx="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="18" x2="12" y2="22" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

export function VoiceRecorder({ listening, onStart, onResult, onError, onEnd }: VoiceRecorderProps) {
  const providerRef = useRef(new GeminiProvider());

  function handleStartClick() {
    const provider = providerRef.current;
    if (!provider.isSupported()) {
      onError("Tu navegador no soporta grabación de audio (probá con Chrome).");
      return;
    }
    onStart();
    provider.start(onResult, onError, onEnd);
  }

  function handleStopClick() {
    providerRef.current.stop();
  }

  if (listening) {
    return (
      <button
        type="button"
        onClick={handleStopClick}
        aria-label="Parar grabación"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white"
      >
        <StopIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartClick}
      aria-label="Grabar audio"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white"
    >
      <MicIcon />
    </button>
  );
}
