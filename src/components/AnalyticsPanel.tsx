/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Coins, Users, TrendingUp, Clock, Flame } from "lucide-react";
import { PlayerState, Lobby, TournamentStats } from "../types";

interface AnalyticsPanelProps {
  lobby: Lobby;
  players: PlayerState[];
}

export default function AnalyticsPanel({ lobby, players }: AnalyticsPanelProps) {
  // Calculations
  const activePlayers = players.filter(p => p.status !== "out");
  const totalPlayersCount = players.length;
  const remainingPlayersCount = activePlayers.length;

  const totalChipsInPlay = players.reduce((sum, p) => sum + p.chipsCount, 0);
  const averageStack = remainingPlayersCount > 0 ? Math.round(totalChipsInPlay / remainingPlayersCount) : 0;
  
  const totalBuyInsValue = players.reduce((sum, p) => sum + (p.buyInCount || 1) * lobby.startingChips, 0);

  // Prepare chart data
  const chartData = players
    .map(p => ({
      name: p.name,
      chips: p.chipsCount,
      status: p.status,
    }))
    .sort((a, b) => b.chips - a.chips);

  const formatChipsValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stat Cards - Grid layout */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        {/* Chips in Play */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Chips in Play
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              {totalChipsInPlay.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Average Stack */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Average Stack Size
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
              {averageStack.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Players Remaining */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Players Remaining
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
              {remainingPlayersCount} <span className="text-slate-500 text-sm">/ {totalPlayersCount}</span>
            </span>
          </div>
        </div>

        {/* Current Blinds */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Current Blinds (Lv {lobby.currentLevel})
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-100">
                {lobby.currentSB} / {lobby.currentBB}
              </span>
              <span className="text-[10px] font-bold bg-slate-850 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Starting Chips: {lobby.startingChips}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart - Distribution */}
      <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Real-Time Chip Distribution
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Comparing stack depths across all table seating positions
            </p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 rounded-full uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" /> LIVE
          </span>
        </div>

        {/* Responsive Recharts */}
        <div className="flex-1 h-44 min-h-[176px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs">
              No tournament data active.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatChipsValue}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 41, 59, 0.4)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">{data.name}</p>
                          <p className="font-mono text-emerald-400">
                            Chips: <span className="font-bold">{data.chips.toLocaleString()}</span>
                          </p>
                          <p className="text-[10px] uppercase font-bold text-slate-500">
                            Status: <span className={data.status === "out" ? "text-red-400" : "text-cyan-400"}>{data.status}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="chips" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status === "out" ? "#ef4444" : entry.status === "folded" ? "#64748b" : "#10b981"}
                      opacity={entry.status === "out" ? 0.3 : entry.status === "folded" ? 0.6 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
