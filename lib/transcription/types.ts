export interface TranscriptionProvider {
  isSupported(): boolean;
  start(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): void;
  stop(): void;
}
