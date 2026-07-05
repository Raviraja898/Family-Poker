/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserDisplayName: string;
}

export default function ChatBox({ messages, onSendMessage, currentUserDisplayName }: ChatBoxProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[320px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-950 border-b border-slate-800">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
          Table Chat
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-1">
            <MessageSquare className="w-6 h-6 opacity-30" />
            <span className="text-[11px] font-medium">No messages yet. Send a greeting!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.senderId === "system";
            const isAdmin = msg.isAdmin;
            
            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-1 px-2 bg-emerald-950/20 border border-emerald-900/10 rounded-lg">
                  <p className="text-[10px] text-emerald-400/90 font-mono italic">
                    {msg.text}
                  </p>
                </div>
              );
            }

            return (
              <div key={msg.id} className="text-xs leading-normal">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span
                    className={`font-semibold ${
                      isAdmin ? "text-yellow-400" : "text-slate-200"
                    }`}
                  >
                    {msg.senderName}
                  </span>
                  {isAdmin && (
                    <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-1 py-[1px] rounded uppercase font-bold tracking-wide scale-90 origin-left">
                      Host
                    </span>
                  )}
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-slate-300 break-words font-sans bg-slate-950/30 px-2 py-1 rounded-lg border border-slate-950/20">
                  {msg.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          id="chat-message-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something to the table..."
          className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
        />
        <button
          id="chat-submit-btn"
          type="submit"
          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
