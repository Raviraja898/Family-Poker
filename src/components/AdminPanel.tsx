/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, Users, UserPlus, Coins, Shield, Clock, RefreshCw, AlertTriangle, 
  Trash2, Play, Pause, ChevronRight, HelpCircle, ArrowUpRight, ArrowDownRight, History
} from "lucide-react";
import { PlayerState, Lobby, GameTransaction } from "../types";

interface AdminPanelProps {
  lobby: Lobby;
  players: PlayerState[];
  transactions: GameTransaction[];
  onUpdateLobby: (updates: Partial<Lobby>) => Promise<void>;
  onAddPlayerProfile: (name: string, startingChips: number) => Promise<void>;
  onAdjustPlayerChips: (playerId: string, adjustment: number) => Promise<void>;
  onBuyInPlayer: (playerId: string) => Promise<void>;
  onEliminatePlayer: (playerId: string) => Promise<void>;
  onResetTournament: () => Promise<void>;
  onAwardPot: (playerId: string) => Promise<void>;
  onAdvanceBlinds: () => Promise<void>;
}

export default function AdminPanel({
  lobby,
  players,
  transactions,
  onUpdateLobby,
  onAddPlayerProfile,
  onAdjustPlayerChips,
  onBuyInPlayer,
  onEliminatePlayer,
  onResetTournament,
  onAwardPot,
  onAdvanceBlinds,
}: AdminPanelProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [startingChipsInput, setStartingChipsInput] = useState(lobby.startingChips.toString());
  const [blindMinutesInput, setBlindMinutesInput] = useState(lobby.blindLevelMinutes.toString());
  const [customSB, setCustomSB] = useState(lobby.currentSB.toString());
  const [customBB, setCustomBB] = useState(lobby.currentBB.toString());

  // Edit stack helpers
  const [adjustingPlayerId, setAdjustingPlayerId] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const sc = parseInt(startingChipsInput) || 2000;
    const bm = parseInt(blindMinutesInput) || 15;
    const sb = parseInt(customSB) || 10;
    const bb = parseInt(customBB) || 20;

    await onUpdateLobby({
      startingChips: sc,
      blindLevelMinutes: bm,
      currentSB: sb,
      currentBB: bb,
    });
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await onAddPlayerProfile(newPlayerName.trim(), lobby.startingChips);
    setNewPlayerName("");
  };

  const handleAdjustChips = async (playerId: string, sign: number) => {
    const amt = parseInt(adjustmentAmount) || 0;
    if (amt <= 0) return;
    await onAdjustPlayerChips(playerId, amt * sign);
    setAdjustmentAmount("");
    setAdjustingPlayerId(null);
  };

  const toggleTimer = async () => {
    if (lobby.blindsTimerPaused) {
      await onUpdateLobby({
        blindsTimerPaused: false,
        blindsTimerStartedAt: Date.now(),
      });
    } else {
      // Calculate remaining
      let remaining = (lobby.blindLevelMinutes * 60);
      if (lobby.blindsTimerStartedAt) {
        const elapsed = Math.floor((Date.now() - lobby.blindsTimerStartedAt) / 1000);
        remaining = Math.max(0, (lobby.pausedRemainingSeconds || (lobby.blindLevelMinutes * 60)) - elapsed);
      }
      await onUpdateLobby({
        blindsTimerPaused: true,
        pausedRemainingSeconds: remaining,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION 1: Session & Blinds configuration */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Settings className="w-4.5 h-4.5 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Configure Starting Chips & Blinds
            </h4>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Starting Chips Stack</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-starting-chips"
                    type="number"
                    value={startingChipsInput}
                    onChange={(e) => setStartingChipsInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Blind Duration (mins)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-blind-duration"
                    type="number"
                    value={blindMinutesInput}
                    onChange={(e) => setBlindMinutesInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Small Blind (SB)</label>
                <input
                  id="admin-sb"
                  type="number"
                  value={customSB}
                  onChange={(e) => setCustomSB(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Big Blind (BB)</label>
                <input
                  id="admin-bb"
                  type="number"
                  value={customBB}
                  onChange={(e) => setCustomBB(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="admin-save-config-btn"
                type="submit"
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Apply Session Configurations
              </button>
              
              <button
                id="admin-timer-toggle-btn"
                type="button"
                onClick={toggleTimer}
                className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  lobby.blindsTimerPaused
                    ? "bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400"
                }`}
              >
                {lobby.blindsTimerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{lobby.blindsTimerPaused ? "Start Clock" : "Pause Clock"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: Create Player Profiles */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserPlus className="w-4.5 h-4.5 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Manual Player Profile Builder
            </h4>
          </div>

          <form onSubmit={handleCreateProfile} className="space-y-4 text-xs">
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Instantly create a profile and seat physically present players or local avatars without requiring separate email account registrations. They will immediately receive configured starting stack chips.
            </p>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">New Player Name</label>
              <input
                id="admin-new-player-name"
                type="text"
                placeholder="Enter player display name..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <button
              id="admin-create-profile-btn"
              type="submit"
              disabled={!newPlayerName.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              Add Profile & Seat Player
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 3: Real-Time Player & Chips Manager */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Seating & Stack Management
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {players.length} Players Seated
          </span>
        </div>

        <div className="overflow-x-auto">
          {players.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No players are currently seated at this table. Add a profile above or share lobby code!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5 px-3">Seat</th>
                  <th className="py-2.5 px-3">Player Name</th>
                  <th className="py-2.5 px-3 text-center">Buy-Ins</th>
                  <th className="py-2.5 px-3 text-right">Current Chips</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right pr-4">Quick Adjust / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {players.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-850/25">
                    {/* Seat Index */}
                    <td className="py-3 px-3 font-mono text-slate-500">#{idx + 1}</td>
                    
                    {/* Display Name */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200">{p.name}</span>
                    </td>

                    {/* Buy-ins count */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-400">
                      {p.buyInCount || 1}
                    </td>

                    {/* Current Stack size */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {p.chipsCount.toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        p.status === "active" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : p.status === "folded"
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : p.status === "sitting_out"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Manual chip action controls */}
                    <td className="py-3 px-3 text-right pr-4 space-x-2">
                      {adjustingPlayerId === p.id ? (
                        <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <input
                            id={`chips-adjust-input-${p.id}`}
                            type="number"
                            placeholder="Amt..."
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            className="w-16 bg-transparent text-slate-200 text-xs px-2 py-1 outline-none text-right font-mono"
                          />
                          <button
                            onClick={() => handleAdjustChips(p.id, 1)}
                            className="p-1 bg-emerald-600/10 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-lg text-emerald-400 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdjustChips(p.id, -1)}
                            className="p-1 bg-red-600/10 hover:bg-red-600/30 border border-red-500/20 rounded-lg text-red-400 cursor-pointer"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAdjustingPlayerId(null)}
                            className="text-[10px] px-1.5 py-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5 items-center">
                          {/* Award Pot / Win */}
                          {p.status !== "out" && (
                            <button
                              onClick={() => onAwardPot(p.id)}
                              className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-yellow-400 font-semibold cursor-pointer"
                              title="Award Active Pot"
                            >
                              Award Pot
                            </button>
                          )}
                          
                          {/* Re-Buy / Plus Starter */}
                          <button
                            onClick={() => onBuyInPlayer(p.id)}
                            className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-lg text-emerald-400 font-semibold cursor-pointer"
                            title="Re-buy starting chips"
                          >
                            Re-Buy
                          </button>

                          {/* Trigger manual adjustment input */}
                          <button
                            onClick={() => setAdjustingPlayerId(p.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
                          >
                            Adjust +/-
                          </button>

                          {/* Eliminate / Out */}
                          {p.status !== "out" && (
                            <button
                              onClick={() => onEliminatePlayer(p.id)}
                              className="p-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-lg text-red-400 cursor-pointer"
                              title="Eliminate player"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 4: Game Mechanics Controls & Reset Emergency */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-4.5 h-4.5 text-yellow-500" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Game Engine & Reset Operations
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <h5 className="font-bold text-slate-200">Force Blinds Hikes</h5>
            <p className="text-slate-400 text-[11px] leading-normal">
              Manually step up blind structures and advance the level multiplier. Next blind levels calculate automatically.
            </p>
            <button
              onClick={onAdvanceBlinds}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Advance Blinds Level
            </button>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <h5 className="font-bold text-slate-200">Reset Current Hand</h5>
            <p className="text-slate-400 text-[11px] leading-normal">
              Clears the community board, folded stakes, and round bets. Keeps player chips untouched.
            </p>
            <button
              onClick={async () => {
                await onUpdateLobby({
                  activeRound: "waiting",
                  communityCards: [],
                  pot: 0,
                  roundPot: 0,
                  lastBetAmount: 0,
                  lastBettorId: null,
                  showdownRevealed: false,
                  winnerAnnouncement: null,
                });
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Reset Hand Board
            </button>
          </div>

          <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-xl space-y-2">
            <h5 className="font-bold text-red-400">Total Tournament Reset</h5>
            <p className="text-red-300 text-[11px] leading-normal">
              Danger: Re-seats all players, resets chips to default, clears board, chat logs, and tournament clock.
            </p>
            <button
              onClick={async () => {
                if (confirm("Are you absolutely sure you want to reset this entire session? This will wipe the table chips, logs and hand status.")) {
                  await onResetTournament();
                }
              }}
              className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-400 hover:text-red-300 font-bold rounded-xl cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: Secure Transaction History */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <History className="w-4.5 h-4.5 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Secure Audit Trail & Transaction Logs
          </h4>
        </div>

        <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No transactions registered for this lobby session yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/50 text-[10px] text-slate-400 font-bold uppercase sticky top-0 border-b border-slate-800">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Action details</th>
                  <th className="py-2.5 px-3 text-right pr-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 bg-slate-900/30 font-mono text-[11px]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/15">
                    {/* Unique Identifier / Hash */}
                    <td className="py-2.5 px-3 text-slate-500 font-bold">
                      {tx.id.substring(0, 8).toUpperCase()}
                    </td>
                    
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </td>
                    
                    {/* Type Badge */}
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        tx.type === "buyin" || tx.type === "rebuy"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                          : tx.type === "pot_won"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/10"
                          : tx.type === "blind"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    
                    {/* Log text details */}
                    <td className="py-2.5 px-3 text-slate-300 leading-normal">
                      {tx.details}
                    </td>
                    
                    {/* Amount */}
                    <td className="py-2.5 px-3 text-right font-bold pr-4 text-slate-200">
                      {tx.amount !== 0 ? (
                        <span className={tx.amount > 0 ? "text-emerald-400" : "text-red-400"}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
