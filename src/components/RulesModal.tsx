/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HelpCircle, X, ChevronRight, Award, Flame, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function RulesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"rankings" | "gameplay" | "cheat_sheet">("rankings");

  const handRankings = [
    { rank: "Royal Flush", desc: "A-K-Q-J-10 of the same suit", example: "🂡 🂮 🂭 🂫 🂪" },
    { rank: "Straight Flush", desc: "Five consecutive cards of the same suit", example: "🂨 🂧 🂶 🂵 🂴" },
    { rank: "Four of a Kind", desc: "Four cards of the exact same rank", example: "🂡 🂱 🃑 🃡 🂪" },
    { rank: "Full House", desc: "Three of a kind combined with a pair", example: "🂮 🂾 🃎 🂡 🂱" },
    { rank: "Flush", desc: "Any five cards of the same suit, not in order", example: "🂡 🂪 🂧 🂤 🂢" },
    { rank: "Straight", desc: "Five consecutive cards of different suits", example: "🂩 🂨 🃗 🂶 🃕" },
    { rank: "Three of a Kind", desc: "Three cards of the exact same rank", example: "🂱 🃑 🂡 🂪 🂤" },
    { rank: "Two Pair", desc: "Two different pairs of ranks", example: "🂡 🂱 🂮 🂾 🂤" },
    { rank: "One Pair", desc: "Two cards of the exact same rank", example: "🂡 🂱 🂮 🂪 🂤" },
    { rank: "High Card", desc: "Your highest single card when no hand is made", example: "🂡 🂪 🂧 🂤 🂢" },
  ];

  return (
    <>
      {/* Small floating action button */}
      <button
        id="rules-toggle-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500/50 rounded-full shadow-lg text-xs font-medium tracking-wide transition-all cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 text-emerald-400" />
        <span>Poker Rules</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-slate-100 font-sans tracking-tight">
                    Texas Hold'em Guide & Hand Rankings
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-900/50 p-2 gap-2 text-xs">
                <button
                  onClick={() => setActiveTab("rankings")}
                  className={`flex-1 py-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === "rankings"
                      ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  Hand Rankings
                </button>
                <button
                  onClick={() => setActiveTab("gameplay")}
                  className={`flex-1 py-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === "gameplay"
                      ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  Gameplay Rounds
                </button>
                <button
                  onClick={() => setActiveTab("cheat_sheet")}
                  className={`flex-1 py-2 text-center rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === "cheat_sheet"
                      ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  Betting Rules
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30 space-y-4">
                {activeTab === "rankings" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Poker hands are constructed using exactly 5 cards. You can combine your two hole cards with any of the five community cards to construct the strongest possible hand.
                    </p>
                    <div className="grid gap-2">
                      {handRankings.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-400 w-5">
                                #{10 - i}
                              </span>
                              <span className="text-sm font-semibold text-slate-100">
                                {h.rank}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 ml-7">{h.desc}</span>
                          </div>
                          <span className="text-xl tracking-wider select-none font-sans text-red-400">
                            {h.example}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "gameplay" && (
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Blinds & Setup</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          The dealer button rotates clockwise after every hand. The player directly to the left of the dealer pays the <strong>Small Blind</strong>, and the next player pays the <strong>Big Blind</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Pre-flop</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Each player is dealt <strong>2 private cards</strong> face down. Betting begins with the player to the left of the Big Blind. Players can Fold, Call (match the Big Blind), or Raise.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">The Flop (Community Cards)</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Three community cards are dealt face up on the table. Another betting round starts, beginning with the first active player left of the dealer button.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300">
                        4
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">The Turn & River</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          A fourth community card (The Turn) is dealt, followed by betting. Then the final community card (The River) is dealt, followed by the final round of betting.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300">
                        5
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Showdown</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Active players reveal their hands. The player with the strongest five-card combination (using any combination of their 2 pocket cards + 5 community cards) wins the total pot.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "cheat_sheet" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <h4 className="text-sm font-bold text-slate-200">Standard Actions</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-950/50">
                          <span className="font-bold text-emerald-400 block mb-0.5">Check</span>
                          <span className="text-slate-400 text-[11px]">Pass the action without betting chips. Only possible if no bet has been made in the current round.</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/50">
                          <span className="font-bold text-emerald-400 block mb-0.5">Call</span>
                          <span className="text-slate-400 text-[11px]">Match the highest bet made in the current round to remain in the hand.</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/50">
                          <span className="font-bold text-emerald-400 block mb-0.5">Bet / Raise</span>
                          <span className="text-slate-400 text-[11px]">Put more chips into the pot. Raises must be at least double the size of the previous bet/raise.</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/50">
                          <span className="font-bold text-red-400 block mb-0.5">Fold</span>
                          <span className="text-slate-400 text-[11px]">Discard your cards and forfeit your interest in the pot. Costs no additional chips.</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-200 space-y-1">
                      <h4 className="font-bold flex items-center gap-1.5 text-amber-300">
                        <Flame className="w-4 h-4 text-amber-400" /> Host Configurations & Directives
                      </h4>
                      <p className="leading-relaxed text-zinc-300">
                        The tournament host can manage blinds, configure starting chips, and perform secure manual chip adjustments at any time to correct player errors, accommodate re-buys, or manage high-stakes tournament tiers.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs tracking-wide rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Got it, Let's Play
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
