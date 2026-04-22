import ReactMarkdown from "react-markdown";
import { Bot, User, Volume2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/chat";

interface ChatMessageProps {
  message: Message;
}

function speakText(text: string) {
  const clean = text.replace(/[#*_~`>\-\[\]()!]/g, "").replace(/\n+/g, ". ");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function openDoctorMap() {
  if (!navigator.geolocation) {
    window.open("https://www.google.com/maps/search/doctor+near+me", "_blank");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      window.open(
        `https://www.google.com/maps/search/doctor+hospital/@${latitude},${longitude},14z`,
        "_blank"
      );
    },
    () => {
      window.open("https://www.google.com/maps/search/doctor+hospital+near+me", "_blank");
    }
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const showDoctorFinder = !isUser && message.content.includes("[FIND_NEARBY_DOCTOR]");
  const displayContent = message.content.replace(/\[FIND_NEARBY_DOCTOR\]/g, "");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-chat-user" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-chat-user-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-chat-user text-chat-user-foreground"
            : "bg-chat-bot text-chat-bot-foreground"
        }`}
      >
        {isUser && message.image && (
          <img src={message.image} alt="Uploaded" className="mb-2 max-h-48 rounded-lg" />
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-headings:text-chat-bot-foreground prose-p:text-chat-bot-foreground prose-strong:text-chat-bot-foreground prose-li:text-chat-bot-foreground prose-ul:text-chat-bot-foreground">
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => speakText(displayContent)}
              >
                <Volume2 className="h-3 w-3" /> Listen
              </Button>
              {showDoctorFinder && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={openDoctorMap}
                >
                  <MapPin className="h-3 w-3" /> Find Nearby Doctor
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
