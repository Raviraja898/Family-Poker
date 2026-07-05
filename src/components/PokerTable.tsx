/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Coins, User, ArrowUpRight, Flame, Sparkles, AlertCircle, Eye, EyeOff, ShieldAlert, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lobby, PlayerState } from "../types";

interface PokerTableProps {
  lobby: Lobby;
  players: PlayerState[];
  currentUserId: string | null;
  onPlaceAction: (actionType: "Fold" | "Check" | "Call" | "Raise" | "All-in", raiseAmount?: number) => Promise<void>;
  onSeatClaim: (seatIndex: number) => Promise<void>;
  onToggleShowCards: (show: boolean) => Promise<void>;
}

// Seat positions around the oval felt table (percentages)
const SEAT_COORDINATES = [
  { left: "50%", top: "85%", translate: "-50% -50%" }, // Seat 0 (Bottom Center / Hero)
  { left: "15%", top: "75%", translate: "-50% -50%" }, // Seat 1 (Bottom Left)
  { left: "8%", top: "45%", translate: "-50% -50%" },  // Seat 2 (Mid Left)
  { left: "15%", top: "15%", translate: "-50% -50%" }, // Seat 3 (Top Left)
  { left: "50%", top: "8%", translate: "-50% -50%" },  // Seat 4 (Top Center)
  { left: "85%", top: "15%", translate: "-50% -50%" }, // Seat 5 (Top Right)
  { left: "92%", top: "45%", translate: "-50% -50%" }, // Seat 6 (Mid Right)
  { left: "85%", top: "75%", translate: "-50% -50%" }, // Seat 7 (Bottom Right)
];

export default function PokerTable({
  lobby,
  players,
  currentUserId,
  onPlaceAction,
  onSeatClaim,
  onToggleShowCards,
}: PokerTableProps) {
  const [raiseVal, setRaiseVal] = useState<number>(0);

  // Find logged-in player profile if any
  const heroPlayer = players.find((p) => p.id === currentUserId);
  const isHeroTurn = lobby.currentTurnPlayerId === currentUserId && currentUserId !== null;

  // Set default raise slider value when it's hero's turn
  useEffect(() => {
    if (isHeroTurn && heroPlayer) {
      const minRaiseAmt = Math.max(lobby.currentBB, lobby.lastBetAmount * 2);
      setRaiseVal(Math.min(heroPlayer.chipsCount, minRaiseAmt));
    }
  }, [isHeroTurn, lobby.lastBetAmount, lobby.currentBB, heroPlayer]);

  // Utility to map suit icon colors
  const getCardStyle = (cardStr: string) => {
    if (!cardStr || cardStr.length < 2) return { suit: "", val: "", isRed: false };
    const val = cardStr.slice(0, -1);
    const suitChar = cardStr.slice(-1);
    
    let suit = "♠";
    let isRed = false;
    
    if (suitChar === "h" || suitChar === "♥") {
      suit = "♥";
      isRed = true;
    } else if (suitChar === "d" || suitChar === "♦") {
      suit = "♦";
      isRed = true;
    } else if (suitChar === "c" || suitChar === "♣") {
      suit = "♣";
    }
    
    return { suit, val, isRed };
  };

  const handleAction = async (type: "Fold" | "Check" | "Call" | "Raise" | "All-in") => {
    if (type === "Raise") {
      await onPlaceAction("Raise", raiseVal);
    } else {
      await onPlaceAction(type);
    }
  };

  // Helper to check if Seat is occupied
  const getPlayerAtSeat = (seatIdx: number) => {
    return players.find((p) => p.seatIndex === seatIdx);
  };

  // Turn calculation constraints
  const callCost = Math.max(0, lobby.lastBetAmount - (heroPlayer?.currentRoundBet || 0));
  const canCheck = lobby.lastBetAmount === 0 || (heroPlayer?.currentRoundBet || 0) >= lobby.lastBetAmount;
  const canCall = !canCheck && heroPlayer && heroPlayer.chipsCount > 0;
  const minRaiseAllowed = Math.max(lobby.currentBB, lobby.lastBetAmount * 2);
  const canRaise = heroPlayer && heroPlayer.chipsCount > callCost && heroPlayer.chipsCount >= minRaiseAllowed;

  return (
    <div className="space-y-6">
      {/* 1. Main Felt Arena Container */}
      <div className="relative w-full aspect-[16/10] md:aspect-[16/9] bg-slate-950 border border-slate-900 rounded-3xl shadow-2xl p-4 overflow-hidden flex items-center justify-center select-none">
        
        {/* Ambient Poker Background Texture / Ring decoration */}
        <div className="absolute inset-8 rounded-[80px] border border-slate-900 bg-slate-900/10 pointer-events-none" />
        <div className="absolute inset-16 rounded-[60px] border-2 border-emerald-500/5 bg-emerald-500/[0.01] pointer-events-none" />

        {/* 2. Oval Green Felt Table */}
        <div className="relative w-[78%] h-[68%] rounded-[110px] bg-gradient-to-b from-emerald-800 to-emerald-950 border-[6px] border-amber-900/50 shadow-[inset_0_12px_24px_rgba(0,0,0,0.6),0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center gap-1">
          
          {/* Subtle felt label watermark */}
          <div className="absolute top-1/4 opacity-10 font-sans tracking-[0.2em] font-black uppercase text-slate-200 pointer-events-none text-xs text-center md:text-sm">
            PRIVATE POKER CLUB
          </div>

          {/* Table Center: Pot and Community Cards */}
          <div className="z-10 flex flex-col items-center justify-center gap-2 max-w-[80%] text-center">
            
            {/* Total Pot Accumulator */}
            {(lobby.pot > 0 || lobby.roundPot > 0) ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 bg-black/50 border border-amber-500/30 px-3 py-1 rounded-full shadow-lg"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-100 font-sans">
                  Pot: <span className="text-amber-400 font-mono">{(lobby.pot + lobby.roundPot).toLocaleString()}</span>
                </span>
              </motion.div>
            ) : (
              <div className="text-[10px] font-bold text-emerald-400/60 tracking-wider uppercase bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                Awaiting Deals
              </div>
            )}

            {/* Community Cards Display */}
            <div className="flex gap-1.5 h-14 md:h-16 items-center">
              {lobby.communityCards && lobby.communityCards.length > 0 ? (
                lobby.communityCards.map((card, cIdx) => {
                  const { suit, val, isRed } = getCardStyle(card);
                  return (
                    <motion.div
                      key={cIdx}
                      initial={{ scale: 0, rotate: -5 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-10 h-14 md:w-12 md:h-16 bg-white border border-slate-200 rounded-lg shadow-md flex flex-col justify-between p-1 font-bold select-none text-slate-950 text-xs md:text-sm leading-none"
                    >
                      <div className="text-left font-mono">{val}</div>
                      <div className={`text-center text-lg leading-none ${isRed ? "text-red-500" : "text-slate-950"}`}>
                        {suit}
                      </div>
                      <div className={`text-right font-mono self-end rotate-180`}>{val}</div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-[10px] text-emerald-300/40 italic flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> No community cards active
                </div>
              )}
            </div>

            {/* Game state sub-label */}
            {lobby.winnerAnnouncement ? (
              <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-xl text-[10px] md:text-xs font-bold leading-relaxed max-w-[280px]">
                🎉 {lobby.winnerAnnouncement}
              </div>
            ) : lobby.currentTurnPlayerId && (
              <div className="text-[9px] md:text-[10px] font-medium text-emerald-300 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                Active round: <span className="capitalize font-bold text-white">{lobby.activeRound}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Seating positions Loop (Avatars and labels placed around table) */}
        {SEAT_COORDINATES.map((pos, seatIdx) => {
          const player = getPlayerAtSeat(seatIdx);
          const isTurn = player && lobby.currentTurnPlayerId === player.id;
          const isDealer = player && lobby.dealerIndex === seatIdx;

          return (
            <div
              key={seatIdx}
              className="absolute z-20"
              style={{
                left: pos.left,
                top: pos.top,
                transform: `translate(${pos.translate})`,
              }}
            >
              {player ? (
                // Occupied Seat
                <div className="relative flex flex-col items-center">
                  
                  {/* Real-Time Emoji Blast Event floating */}
                  <AnimatePresence>
                    {player.emojiBlast && (
                      <motion.div
                        key={`${player.id}-${player.emojiBlast.timestamp}`}
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -45, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute -top-6 text-3xl z-40 select-none pointer-events-none filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      >
                        {player.emojiBlast.emoji}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dealer Button token marker */}
                  {isDealer && (
                    <div className="absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center font-black text-[10px] text-slate-950 shadow-md select-none">
                      D
                    </div>
                  )}

                  {/* Seat card graphics (if active player has cards) */}
                  {player.status !== "out" && player.status !== "sitting_out" && player.cards && player.cards.length > 0 && (
                    <div className="absolute -top-8 flex gap-1 h-10 items-end z-10 scale-90">
                      {player.cards.map((card, idx) => {
                        // Reveal conditions: It's the Hero player OR game is in Showdown with revealed status OR player explicitly opted to show cards
                        const isHero = player.id === currentUserId;
                        const reveal = isHero || player.showCards || lobby.activeRound === "showdown";

                        if (reveal) {
                          const { suit, val, isRed } = getCardStyle(card);
                          return (
                            <motion.div
                              key={idx}
                              initial={{ y: 15, rotate: -10, opacity: 0 }}
                              animate={{ y: 0, rotate: idx === 0 ? -4 : 4, opacity: 1 }}
                              className="w-7 h-10 bg-white border border-slate-200 rounded-md shadow flex flex-col justify-between p-0.5 font-bold select-none text-[10px] text-slate-950 leading-none"
                            >
                              <div className="text-left font-mono">{val}</div>
                              <div className={`text-center text-[12px] leading-none ${isRed ? "text-red-500" : "text-slate-950"}`}>
                                {suit}
                              </div>
                            </motion.div>
                          );
                        } else {
                          // Standard card back face-down
                          return (
                            <motion.div
                              key={idx}
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="w-7 h-10 bg-gradient-to-br from-red-600 to-red-900 border border-slate-200/20 rounded-md shadow-md flex items-center justify-center text-white"
                            >
                              <div className="text-[7px] font-black uppercase text-red-100 rotate-45 select-none font-mono opacity-50">
                                CLUB
                              </div>
                            </motion.div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {/* Seat Card / Avatar wrapper */}
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex flex-col items-center justify-center border-3 relative shadow-xl transition-all duration-300 ${
                      isTurn
                        ? "border-amber-400 bg-slate-900 scale-110 shadow-amber-500/20"
                        : player.status === "folded"
                        ? "border-slate-800 bg-slate-950 grayscale opacity-40"
                        : player.status === "out"
                        ? "border-red-900 bg-slate-950 opacity-30 cursor-not-allowed"
                        : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    {/* Visual pulse glow for active turn */}
                    {isTurn && (
                      <div className="absolute inset-0 rounded-full border-3 border-amber-400 animate-ping opacity-30 pointer-events-none" />
                    )}

                    {/* Inner avatar letter or user icon */}
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                      {player.name.substring(0, 2)}
                    </span>

                    {/* Seat action sub-badge */}
                    {player.lastAction && player.lastAction !== "None" && (
                      <span className="absolute -bottom-1 bg-slate-950 border border-slate-800 text-slate-300 font-bold px-1.5 py-0.2 rounded text-[8px] tracking-wide uppercase select-none">
                        {player.lastAction}
                      </span>
                    )}
                  </div>

                  {/* Player Name and Chip Labels */}
                  <div className="mt-1.5 bg-slate-950/80 border border-slate-800/60 px-2 py-0.5 rounded-lg text-center max-w-[90px] shadow-sm">
                    <span className="text-[10px] font-bold text-slate-200 truncate block">
                      {player.name}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 block mt-0.2">
                      {player.chipsCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                // Open empty seat
                <button
                  id={`seat-claim-btn-${seatIdx}`}
                  onClick={() => onSeatClaim(seatIdx)}
                  className="w-12 h-12 rounded-full border-2 border-dashed border-slate-800 hover:border-emerald-500/40 bg-slate-950/40 hover:bg-emerald-950/10 flex flex-col items-center justify-center text-slate-600 hover:text-emerald-400 transition-all cursor-pointer text-[10px]"
                >
                  <User className="w-4 h-4 mb-0.5 opacity-50" />
                  <span>Seat</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Active Player Action controls board (Shown only during active games) */}
      {heroPlayer && heroPlayer.status === "active" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-slate-100">
                  Your Stack: <span className="text-emerald-400 font-mono">{heroPlayer.chipsCount.toLocaleString()}</span> chips
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Current highest round bet: <span className="font-mono">{lobby.lastBetAmount}</span> | Your current bet: <span className="font-mono">{heroPlayer.currentRoundBet}</span>
                </span>
              </div>
            </div>

            {/* Secret Cards Reveal state toggle */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                id="toggle-show-cards-btn"
                onClick={() => onToggleShowCards(!heroPlayer.showCards)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  heroPlayer.showCards
                    ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                }`}
              >
                {heroPlayer.showCards ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{heroPlayer.showCards ? "Hide Cards" : "Show Cards"}</span>
              </button>
            </div>
          </div>

          {/* Action buttons (Disabled if not Hero's Turn) */}
          <div className="space-y-4">
            {!isHeroTurn ? (
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-600" />
                <span>Awaiting player turns... Stay tuned.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Raise Slider input (Visible if Raise action is allowed) */}
                {canRaise && (
                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Raise Betting Amount:</span>
                      <span className="text-emerald-400 font-mono text-sm">{raiseVal.toLocaleString()} chips</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-mono">{minRaiseAllowed}</span>
                      <input
                        id="raise-range-slider"
                        type="range"
                        min={minRaiseAllowed}
                        max={heroPlayer.chipsCount}
                        step={10}
                        value={raiseVal}
                        onChange={(e) => setRaiseVal(parseInt(e.target.value) || minRaiseAllowed)}
                        className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg outline-none cursor-ew-resize"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">{heroPlayer.chipsCount}</span>
                    </div>
                  </div>
                )}

                {/* 2. Primary Turn-Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  {/* FOLD */}
                  <button
                    id="action-fold-btn"
                    onClick={() => handleAction("Fold")}
                    className="py-3 bg-red-950/20 hover:bg-red-950/30 border border-red-500/20 text-red-400 hover:text-red-300 font-bold rounded-xl shadow transition-all cursor-pointer"
                  >
                    Fold Hand
                  </button>

                  {/* CHECK */}
                  <button
                    id="action-check-btn"
                    onClick={() => handleAction("Check")}
                    disabled={!canCheck}
                    className="py-3 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 text-slate-200 hover:text-white font-bold rounded-xl shadow transition-all cursor-pointer"
                  >
                    Check
                  </button>

                  {/* CALL */}
                  <button
                    id="action-call-btn"
                    onClick={() => handleAction("Call")}
                    disabled={!canCall}
                    className="py-3 bg-emerald-600/10 hover:bg-emerald-600/20 disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-500/20 text-emerald-400 font-bold rounded-xl shadow transition-all cursor-pointer"
                  >
                    Call ({callCost})
                  </button>

                  {/* RAISE */}
                  <button
                    id="action-raise-btn"
                    onClick={() => handleAction("Raise")}
                    disabled={!canRaise}
                    className="py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-black rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Raise to {raiseVal}
                  </button>

                  {/* ALL-IN */}
                  <button
                    id="action-allin-btn"
                    onClick={() => handleAction("All-in")}
                    className="py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg col-span-2 sm:col-span-1 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    All-In!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
