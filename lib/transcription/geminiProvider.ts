import { TranscriptionProvider } from "./types";

export class GeminiProvider implements TranscriptionProvider {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  async start(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
        this.recorder = null;

        const blob = new Blob(chunks, { type: recorder.mimeType });
        const formData = new FormData();
        formData.append("audio", blob, "audio.webm");

        try {
          const response = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!response.ok) throw new Error("No pude transcribir el audio");

          const { text } = await response.json();
          onResult(text);
        } catch (err) {
          onError((err as Error).message);
        } finally {
          onEnd();
        }
      };

      this.recorder = recorder;
      recorder.start();
    } catch {
      onError("No pude acceder al micrófono.");
    }
  }

  stop(): void {
    this.recorder?.stop();
  }
}
