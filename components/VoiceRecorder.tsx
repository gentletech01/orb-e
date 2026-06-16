"use client";

import { useRef } from "react";
import { WebSpeechProvider } from "@/lib/transcription/webSpeechProvider";

interface VoiceRecorderProps {
  listening: boolean;
  onStart: () => void;
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export function VoiceRecorder({ listening, onStart, onResult, onError, onEnd }: VoiceRecorderProps) {
  const providerRef = useRef(new WebSpeechProvider());

  function handleStartClick() {
    const provider = providerRef.current;
    if (!provider.isSupported()) {
      onError("Tu navegador no soporta reconocimiento de voz (probá con Chrome).");
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
        ⏹
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
      🎤
    </button>
  );
}
