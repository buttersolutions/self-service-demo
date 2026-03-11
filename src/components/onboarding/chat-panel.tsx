"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Upload, UserPlus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
  options?: ChatOption[];
  showInput?: boolean;
  showUpload?: boolean;
}

interface ChatOption {
  label: string;
  icon?: React.ReactNode;
  value: string;
}

interface ChatPanelProps {
  scanComplete: boolean;
  businessName: string;
  onComplete: () => void;
}

const CHAT_FLOW: ChatMessage[] = [
  {
    id: "welcome",
    type: "bot",
    text: "I'm gathering info about your business. I'll ask a few quick questions while we set things up.",
  },
  {
    id: "employees",
    type: "bot",
    text: "How would you like to add your team members?",
    options: [
      { label: "Upload a spreadsheet", icon: <FileSpreadsheet className="w-4 h-4" />, value: "upload" },
      { label: "Add them manually", icon: <UserPlus className="w-4 h-4" />, value: "manual" },
      { label: "Skip for now", value: "skip" },
    ],
  },
];

const FOLLOW_UP_UPLOAD: ChatMessage = {
  id: "upload-prompt",
  type: "bot",
  text: "Upload a CSV or Excel file with your team. We need at minimum: name and role.",
  showUpload: true,
};

const FOLLOW_UP_MANUAL: ChatMessage = {
  id: "manual-prompt",
  type: "bot",
  text: "No problem! You can add team members after setup. How many employees do you have approximately?",
  showInput: true,
};

const MISSING_INFO: ChatMessage[] = [
  {
    id: "logo",
    type: "bot",
    text: "We couldn't detect a logo from your website. Would you like to upload one?",
    options: [
      { label: "Upload logo", icon: <Upload className="w-4 h-4" />, value: "upload-logo" },
      { label: "Skip for now", value: "skip-logo" },
    ],
  },
  {
    id: "done",
    type: "bot",
    text: "That's all I need for now. We're finishing up the setup — your dashboard will be ready in just a moment.",
  },
];

export function ChatPanel({ scanComplete, businessName, onComplete }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [flowPhase, setFlowPhase] = useState<"initial" | "followup" | "missing" | "done">("initial");
  const [missingIndex, setMissingIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (flowPhase === "initial" && currentFlowIndex < CHAT_FLOW.length) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const msg = CHAT_FLOW[currentFlowIndex];
          setMessages((prev) => [...prev, msg]);
          if (msg.showInput) setShowInput(true);
          if (msg.showUpload) setShowUpload(true);
          setCurrentFlowIndex((prev) => prev + 1);
        }, 1200);
      }, currentFlowIndex === 0 ? 2000 : 800);
      return () => clearTimeout(timer);
    }
  }, [currentFlowIndex, flowPhase]);

  useEffect(() => {
    if (scanComplete && flowPhase === "followup") {
      const timer = setTimeout(() => setFlowPhase("missing"), 1500);
      return () => clearTimeout(timer);
    }
  }, [scanComplete, flowPhase]);

  useEffect(() => {
    if (flowPhase === "missing" && missingIndex < MISSING_INFO.length) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const msg = MISSING_INFO[missingIndex];
          setMessages((prev) => [...prev, msg]);
          setMissingIndex((prev) => prev + 1);
          if (msg.id === "done") {
            setFlowPhase("done");
            setTimeout(() => onComplete(), 2000);
          }
        }, 1200);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [flowPhase, missingIndex, onComplete]);

  const handleOptionClick = (option: ChatOption) => {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, type: "user", text: option.label }]);

    if (option.value === "upload") {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [...prev, FOLLOW_UP_UPLOAD]);
          setShowUpload(true);
          setFlowPhase("followup");
        }, 1000);
      }, 500);
    } else if (option.value === "manual") {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [...prev, FOLLOW_UP_MANUAL]);
          setShowInput(true);
          setFlowPhase("followup");
        }, 1000);
      }, 500);
    } else if (option.value === "skip" || option.value === "skip-logo") {
      setFlowPhase("followup");
      setShowInput(false);
      setShowUpload(false);
    } else if (option.value === "upload-logo") {
      setMessages((prev) => [
        ...prev,
        { id: "bot-logo-ok", type: "bot", text: "You can upload your logo from the dashboard after setup." },
      ]);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, type: "user", text: inputValue }]);
    setInputValue("");
    setShowInput(false);
    setFlowPhase("followup");

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: `bot-ack-${Date.now()}`, type: "bot", text: "Got it, thanks! We'll keep that in mind during setup." },
        ]);
      }, 800);
    }, 500);
  };

  const handleUpload = () => {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, type: "user", text: "employees.csv uploaded" }]);
    setShowUpload(false);

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: `bot-upload-${Date.now()}`, type: "bot", text: "File received! We found 24 team members. We'll import them into your account." },
        ]);
        setFlowPhase("followup");
      }, 1500);
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-background border-t border-border font-sans">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground">Setup Assistant</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.type === "bot" && (
                <Avatar className="w-7 h-7 mr-2 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    AG
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="max-w-[80%]">
                <Card
                  className={`px-4 py-2.5 ${
                    msg.type === "user"
                      ? "bg-primary text-primary-foreground border-primary"
                      : ""
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </Card>
                {/* Options */}
                {msg.options && (
                  <div className="mt-2 space-y-1.5">
                    {msg.options.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptionClick(opt)}
                        className="w-full justify-start gap-2.5 font-sans"
                      >
                        {opt.icon}
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">AG</AvatarFallback>
            </Avatar>
            <Card className="px-4 py-3 w-16">
              <div className="flex items-center gap-1">
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                  animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                  animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                  animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Upload area */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-2"
          >
            <button
              onClick={handleUpload}
              className="w-full border-2 border-dashed border-border hover:border-muted-foreground rounded-lg p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload CSV or Excel file</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={showInput ? "Type your answer..." : "Ask a question..."}
            className="font-sans"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
