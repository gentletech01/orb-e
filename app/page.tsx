import { ChatBot } from "@/components/ChatBot";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="fixed bottom-6 right-6">
        <ChatBot />
      </div>
    </div>
  );
}
