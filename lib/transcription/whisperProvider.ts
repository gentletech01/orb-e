import { TranscriptionProvider } from "./types";

// TODO: implement once Whisper is wired up. It should record audio (MediaRecorder),
// POST the blob to an `/api/transcribe` route that calls the Whisper API, and
// invoke onResult with the returned transcript. Same interface as WebSpeechProvider,
// so swapping providers in ChatBot.tsx requires no other changes.
export class WhisperProvider implements TranscriptionProvider {
  isSupported(): boolean {
    return false;
  }

  start(_onResult: (text: string) => void, onError: (error: string) => void): void {
    onError("WhisperProvider todavía no está implementado.");
  }

  stop(): void {}
}
