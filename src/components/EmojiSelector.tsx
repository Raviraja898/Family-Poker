/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Smile } from "lucide-react";

interface EmojiSelectorProps {
  onSendEmoji: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiSelector({ onSendEmoji, disabled }: EmojiSelectorProps) {
  const emojis = ["😎", "😂", "😭", "😡", "💸", "🔥", "🚀", "🤫", "🍀", "👍", "👎", "🃏"];

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
      <div className="flex items-center gap-1.5 px-1 text-slate-400">
        <Smile className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-[10px] font-bold tracking-wider uppercase">Send Reaction</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => !disabled && onSendEmoji(emoji)}
            disabled={disabled}
            className={`w-9 h-9 flex items-center justify-center text-lg hover:scale-125 hover:bg-slate-800 active:scale-95 rounded-xl transition-all cursor-pointer ${
              disabled ? "opacity-50 cursor-not-allowed grayscale" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
