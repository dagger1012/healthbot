import { useState, useRef, useEffect, useCallback } from "react";
import { HeartPulse, Menu } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TypingIndicator } from "@/components/TypingIndicator";
import { QuickPrompts } from "@/components/QuickPrompts";
import {
  streamChat,
  type Message,
  type Conversation,
  loadConversations,
  saveConversation,
  deleteConversation,
  getActiveConversationId,
  setActiveConversationId,
  generateId,
} from "@/lib/chat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(getActiveConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load active conversation messages
  useEffect(() => {
    if (activeId) {
      const convo = conversations.find((c) => c.id === activeId);
      setMessages(convo?.messages || []);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const persistMessages = useCallback(
    (id: string, msgs: Message[], title?: string) => {
      const convo: Conversation = {
        id,
        title: title || msgs[0]?.content.slice(0, 40) || "New Chat",
        messages: msgs,
        updatedAt: Date.now(),
      };
      saveConversation(convo);
      setConversations(loadConversations());
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, image?: string) => {
      if (isLoading) return;

      let currentId = activeId;
      if (!currentId) {
        currentId = generateId();
        setActiveId(currentId);
        setActiveConversationId(currentId);
      }

      const userMsg: Message = { role: "user", content, ...(image && { image }) };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);

      let assistantContent = "";

      const upsert = (chunk: string) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      };

      try {
        await streamChat({
          messages: updatedMessages,
          onDelta: upsert,
          onDone: () => {
            setIsLoading(false);
            setMessages((prev) => {
              persistMessages(currentId!, prev, content.slice(0, 40));
              return prev;
            });
          },
          onError: (err) => {
            setIsLoading(false);
            toast({ title: "Error", description: err, variant: "destructive" });
          },
        });
      } catch {
        setIsLoading(false);
        toast({
          title: "Connection error",
          description: "Could not reach the health assistant. Please try again.",
          variant: "destructive",
        });
      }
    },
    [messages, isLoading, toast, activeId, persistMessages]
  );

  const handleNewChat = () => {
    setActiveId(null);
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveId(id);
    setActiveConversationId(id);
    setSidebarOpen(false);
  };

  const handleDeleteChat = (id: string) => {
    deleteConversation(id);
    setConversations(loadConversations());
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectChat}
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 min-w-0 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <HeartPulse className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-semibold text-foreground">HealthBot</h1>
              <p className="text-xs text-muted-foreground">AI Health Assistant • Indian Diet & Medicine</p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Chat area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <HeartPulse className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  Welcome to HealthBot
                </h2>
                <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                  Share your health data, symptoms, photos, or questions. Get analysis with Indian diet tips, medicine suggestions, and nearby doctor recommendations.
                </p>
                <QuickPrompts onSelect={(msg) => sendMessage(msg)} />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <TypingIndicator />
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input */}
        <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              HealthBot is an AI assistant, not a medical professional. Always consult a doctor for medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
