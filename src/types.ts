/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  allTimeWins: number; // number of 1st places in tournaments
  allTimeLosses: number; // times gone out early
  tournamentsPlayed: number;
  totalEarnings: number; // chip accumulations
  totalBuyIns: number; // total chips bought in
  isAdmin?: boolean;
}

export interface Lobby {
  id: string; // 5-letter short code
  name: string;
  status: "lobby" | "active" | "completed";
  hostId: string;
  hostName: string;
  startingChips: number;
  
  // Blind structures
  currentSB: number;
  currentBB: number;
  currentLevel: number;
  blindLevelMinutes: number;
  blindsTimerStartedAt: number | null; // Milliseconds timestamp
  blindsTimerPaused: boolean;
  pausedRemainingSeconds: number | null; // Seconds remaining when paused

  // Poker engine states
  activeRound: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
  dealerIndex: number;
  currentTurnPlayerId: string | null;
  pot: number;
  roundPot: number; // Accumulated bets in the current round
  communityCards: string[]; // e.g. ["As", "Kh", "Qd"]
  minRaise: number;
  lastBetAmount: number;
  lastBettorId: string | null;
  showdownRevealed: boolean; // Whether cards are flipped up
  winnerAnnouncement: string | null; // e.g. "John wins 500 chips with a Flush"
  
  // Info
  playersCount: number;
  createdAt: number;
}

export interface PlayerState {
  id: string; // uid of user
  name: string;
  chips: string | number; // Support string for editing, parse before calculations
  chipsCount: number; // Numeric parsed chip count
  buyInCount: number; // Number of buy-ins
  status: "active" | "folded" | "out" | "sitting_out";
  cards: string[]; // Two cards (e.g. ["Ah", "Ks"])
  currentRoundBet: number; // Chips bet in current round
  seatIndex: number; // 0 to 7 (max 8 players)
  lastAction: "Check" | "Call" | "Raise" | "Fold" | "None" | "All-in" | string;
  emojiBlast: {
    emoji: string;
    timestamp: number;
  } | null;
  joinedAt: number;
  showCards: boolean; // Reveal cards to everyone
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isAdmin?: boolean;
}

export interface GameTransaction {
  id: string;
  timestamp: number;
  type: "buyin" | "blind" | "poker_action" | "pot_won" | "admin_adjustment" | "payout" | "rebuy";
  details: string;
  playerId: string | null;
  playerName: string | null;
  amount: number;
  chipsBefore: number;
  chipsAfter: number;
}

export interface TournamentStats {
  totalChipsInPlay: number;
  averageStack: number;
  playersRemaining: number;
  totalBuyInsValue: number;
  blindLevel: number;
  nextSB: number;
  nextBB: number;
}
