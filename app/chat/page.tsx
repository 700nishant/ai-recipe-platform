"use client";

import * as React from "react";
import { ChefHat, Send, Sparkles, UtensilsCrossed, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/services/api";
import { useToast } from "@/components/ui/toast";

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

export default function ChatPage() {
  const { toast } = useToast();
  
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "model",
      parts: [
        {
          text: "Bonjour! I am Chef Gourmet, your personal Michelin-starred assistant. How can I help you in the kitchen today? You can ask me to write a menu, suggest recipe substitutions, explain culinary terminology, or fix a sauce!"
        }
      ]
    }
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Substitute eggs in baking",
    "What goes well with salmon?",
    "Explain 'folding' in cakes",
    "Quick keto snack idea",
    "How to salvage salty soup"
  ];

  // Auto scroll
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput("");
    
    const userMessage: Message = {
      role: "user",
      parts: [{ text }]
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      // Pass the existing chat history (except the newly added user message) to the API
      const response = await api.sendChefMessage(text, messages);
      
      const chefMessage: Message = {
        role: "model",
        parts: [{ text: response.reply }]
      };
      
      setMessages((prev) => [...prev, chefMessage]);
    } catch (err) {
      toast({
        title: "Communication failure",
        description: "Chef Gourmet could not process your message.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      setMessages([
        {
          role: "model",
          parts: [{ text: "Chat history cleared. How can I assist you with your next recipe?" }]
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[80vh] py-2">
      {/* Suggestions Sidebar */}
      <div className="w-full md:w-64 flex flex-col gap-4 shrink-0 h-fit md:h-full">
        <Card className="p-4 flex flex-col gap-4 bg-zinc-50/60 dark:bg-zinc-950/40 h-full border border-zinc-150 dark:border-zinc-800">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
            <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-brand-primary" />
              <span>Suggested Queries</span>
            </h3>
            {messages.length > 1 && (
              <button
                onClick={handleClearChat}
                className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSend(prompt)}
                disabled={sending}
                className="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all cursor-pointer whitespace-nowrap md:whitespace-normal disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Chat Messenger Console */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden p-0 border border-zinc-150/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/70 shadow-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary">
            <ChefHat className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 font-sans">Chef Gourmet</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">AI Assistant Online</span>
            </div>
          </div>
        </div>

        {/* Message Bubble Feed Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-zinc-50/20 dark:bg-zinc-950/10">
          {messages.map((msg, index) => {
            const isChef = msg.role === "model";
            return (
              <div
                key={index}
                className={`flex w-full ${isChef ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    isChef
                      ? "bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 border border-zinc-150 dark:border-zinc-800/80"
                      : "bg-brand-primary text-white"
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.parts[0].text}</p>
                </div>
              </div>
            );
          })}
          
          {sending && (
            <div className="flex w-full justify-start">
              <div className="bg-white dark:bg-zinc-900 text-zinc-450 rounded-2xl px-4 py-3.5 border border-zinc-150 dark:border-zinc-805 flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input box */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask Chef Gourmet about recipes, methods, cooking tips..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1 px-4 py-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-transparent transition-all"
            />
            <Button type="submit" disabled={!input.trim() || sending} className="px-4.5 cursor-pointer">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
