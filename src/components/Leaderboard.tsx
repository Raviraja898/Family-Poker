/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Trophy, Award, Search, TrendingUp, RefreshCw, Star } from "lucide-react";
import { UserProfile } from "../types";

interface LeaderboardProps {
  users: UserProfile[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function Leaderboard({ users, loading, onRefresh }: LeaderboardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredUsers = users
    .filter((user) =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Primary sorting: Wins (1st place finishes)
      if (b.allTimeWins !== a.allTimeWins) {
        return b.allTimeWins - a.allTimeWins;
      }
      // Secondary sorting: Total earnings
      return b.totalEarnings - a.totalEarnings;
    });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-6 bg-slate-950 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">
              All-Time Poker Leaderboard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracking victories, buy-ins, and earnings across tournaments
            </p>
          </div>
        </div>

        {/* Action button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="leaderboard-search-input"
            type="text"
            placeholder="Search players by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
            <span>Loading player statistics...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No player profiles found. Join or register players to see stats!
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/20 text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                <th className="py-3 px-4 text-center w-12">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4 text-center w-24">1st Wins 🏆</th>
                <th className="py-3 px-4 text-center w-24">Early Out 💀</th>
                <th className="py-3 px-4 text-center w-24">Played</th>
                <th className="py-3 px-4 text-right pr-6 w-36">Total Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredUsers.map((user, idx) => {
                const rank = idx + 1;
                const isTopThree = rank <= 3;
                
                return (
                  <tr
                    key={user.uid}
                    className="group hover:bg-slate-850/30 transition-colors text-xs"
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {rank === 1 ? (
                          <div className="w-6 h-6 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold">
                            1
                          </div>
                        ) : rank === 2 ? (
                          <div className="w-6 h-6 rounded-full bg-slate-300/15 border border-slate-300/30 flex items-center justify-center text-slate-300 font-bold">
                            2
                          </div>
                        ) : rank === 3 ? (
                          <div className="w-6 h-6 rounded-full bg-amber-700/15 border border-amber-700/30 flex items-center justify-center text-amber-500 font-bold">
                            3
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-500">{rank}</span>
                        )}
                      </div>
                    </td>

                    {/* Username Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                          {user.displayName.charAt(0).toUpperCase()}
                          {user.isAdmin && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 border border-slate-900 rounded-full p-[2px]">
                              <Star className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-white transition-colors">
                            {user.displayName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Wins count */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-yellow-500">{user.allTimeWins || 0}</span>
                    </td>

                    {/* Losses count */}
                    <td className="py-3 px-4 text-center text-slate-400">
                      {user.allTimeLosses || 0}
                    </td>

                    {/* Total Tournaments */}
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {user.tournamentsPlayed || 0}
                    </td>

                    {/* Accumulated Earnings */}
                    <td className="py-3 px-4 text-right pr-6 font-mono font-bold text-emerald-400">
                      {(user.totalEarnings || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
