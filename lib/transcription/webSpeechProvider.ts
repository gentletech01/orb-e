import { TranscriptionProvider } from "./types";

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export class WebSpeechProvider implements TranscriptionProvider {
  private recognition: SpeechRecognitionLike | null = null;

  isSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }

  start(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): void {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      onError("Tu navegador no soporta reconocimiento de voz (probá con Chrome).");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let settled = false;

    recognition.onresult = (event) => {
      settled = true;
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      onResult(transcript);
    };

    recognition.onerror = (event) => {
      settled = true;
      onError(event.error);
    };

    recognition.onend = () => {
      this.recognition = null;
      if (!settled) onEnd();
    };

    this.recognition = recognition;
    recognition.start();
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }
}
