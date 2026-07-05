/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Trophy, Coins, LogOut, Shield, ChevronRight, UserPlus, Users, Sparkles, 
  Plus, Settings, Volume2, VolumeX, RefreshCw, Star, Info, Share2, Clipboard, ChevronLeft, Clock
} from "lucide-react";
import { 
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithPopup, GoogleAuthProvider
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, updateDoc, collection, onSnapshot, query, orderBy, limit, addDoc, getDocs, writeBatch, runTransaction
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, Lobby, PlayerState, ChatMessage, GameTransaction } from "./types";
import PokerTable from "./components/PokerTable";
import ChatBox from "./components/ChatBox";
import EmojiSelector from "./components/EmojiSelector";
import AnalyticsPanel from "./components/AnalyticsPanel";
import AdminPanel from "./components/AdminPanel";
import RulesModal from "./components/RulesModal";
import Leaderboard from "./components/Leaderboard";

export default function App() {
  // Navigation / Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Login input values
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Global Leaderboard / All Users list
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Active Lobby State
  const [currentLobbyId, setCurrentLobbyId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transactions, setTransactions] = useState<GameTransaction[]>([]);

  // Local navigation screen
  const [activeScreen, setActiveScreen] = useState<"lobby_home" | "poker_room">("lobby_home");

  // Inputs for creating / joining lobbies
  const [lobbyNameInput, setLobbyNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Clock countdown state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Check URL query parameters for invite link: e.g. ?lobby=ABCDE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lobbyCode = params.get("lobby");
    if (lobbyCode) {
      setJoinCodeInput(lobbyCode.toUpperCase());
    }
  }, []);

  // 1. Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            // Setup default profile if missing
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              username: firebaseUser.email?.split("@")[0] || "player",
              displayName: firebaseUser.email?.split("@")[0] || "Player",
              allTimeWins: 0,
              allTimeLosses: 0,
              tournamentsPlayed: 0,
              totalEarnings: 0,
              totalBuyIns: 0,
              isAdmin: false,
            };
            await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile);
            setUser(fallbackProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // 2. Load Leaderboard statistics
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const q = query(collection(db, "users"), limit(50));
      const querySnapshot = await getDocs(q);
      const userList: UserProfile[] = [];
      querySnapshot.forEach((d) => {
        userList.push(d.data() as UserProfile);
      });
      setLeaderboardUsers(userList);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
    setLeaderboardLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user, activeScreen]);

  // 3. Real-Time Active Lobby Subscriptions (Lobby doc, Players, Chat, Transactions)
  useEffect(() => {
    if (!currentLobbyId) return;

    // Sub A: Lobby Main info
    const unsubLobby = onSnapshot(doc(db, "lobbies", currentLobbyId), (docSnap) => {
      if (docSnap.exists()) {
        setLobby(docSnap.data() as Lobby);
      } else {
        // Lobby terminated
        setCurrentLobbyId(null);
        setActiveScreen("lobby_home");
        setActionError("Lobby was terminated or does not exist.");
      }
    });

    // Sub B: Players list (ordered by joined timestamp)
    const unsubPlayers = onSnapshot(
      query(collection(db, "lobbies", currentLobbyId, "players"), orderBy("joinedAt", "asc")),
      (snap) => {
        const playerList: PlayerState[] = [];
        snap.forEach((doc) => {
          playerList.push(doc.data() as PlayerState);
        });
        setPlayers(playerList);
      }
    );

    // Sub C: Chat messages (ordered by timestamp, last 60)
    const unsubMessages = onSnapshot(
      query(collection(db, "lobbies", currentLobbyId, "messages"), orderBy("timestamp", "asc"), limit(60)),
      (snap) => {
        const messageList: ChatMessage[] = [];
        snap.forEach((doc) => {
          messageList.push(doc.data() as ChatMessage);
        });
        setMessages(messageList);
      }
    );

    // Sub D: Transactions audit (ordered by timestamp desc, last 100)
    const unsubTransactions = onSnapshot(
      query(collection(db, "lobbies", currentLobbyId, "transactions"), orderBy("timestamp", "desc"), limit(100)),
      (snap) => {
        const txList: GameTransaction[] = [];
        snap.forEach((doc) => {
          txList.push(doc.data() as GameTransaction);
        });
        setTransactions(txList);
      }
    );

    return () => {
      unsubLobby();
      unsubPlayers();
      unsubMessages();
      unsubTransactions();
    };
  }, [currentLobbyId]);

  // 4. Timer Tick-countdown synchronizer
  useEffect(() => {
    if (!lobby || lobby.blindsTimerPaused || !lobby.blindsTimerStartedAt) {
      if (lobby) {
        setSecondsRemaining(lobby.pausedRemainingSeconds || (lobby.blindLevelMinutes * 60));
      }
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lobby.blindsTimerStartedAt!) / 1000);
      const startLimit = lobby.pausedRemainingSeconds || (lobby.blindLevelMinutes * 60);
      const remaining = Math.max(0, startLimit - elapsed);
      setSecondsRemaining(remaining);

      // Trigger automatic blinds increase if timer hits 0 (executed by host to prevent dual writes)
      if (remaining <= 0 && user && user.uid === lobby.hostId) {
        triggerAdvanceBlinds();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lobby, user]);

  // AUTH ACTIONS
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginId.trim() || !loginPassword.trim()) {
      setAuthError("Please fill out all credentials.");
      return;
    }

    // Convert short ID to valid Firebase email format internally
    const mappedEmail = `${loginId.trim().toLowerCase()}@poker.com`;

    try {
      if (isRegistering) {
        if (!loginDisplayName.trim()) {
          setAuthError("Please provide a screen display name.");
          return;
        }
        // Register standard user
        const res = await createUserWithEmailAndPassword(auth, mappedEmail, loginPassword);
        const newProfile: UserProfile = {
          uid: res.user.uid,
          username: loginId.trim().toLowerCase(),
          displayName: loginDisplayName.trim(),
          allTimeWins: 0,
          allTimeLosses: 0,
          tournamentsPlayed: 0,
          totalEarnings: 0,
          totalBuyIns: 1, // first buy-in count placeholder
          isAdmin: loginId.trim().toLowerCase() === "admin", // set "admin" keyword to naturally grant host permissions
        };
        await setDoc(doc(db, "users", res.user.uid), newProfile);
        setUser(newProfile);
      } else {
        // Sign In
        const res = await signInWithEmailAndPassword(auth, mappedEmail, loginPassword);
        const userDoc = await getDoc(doc(db, "users", res.user.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("Invalid username ID or incorrect password.");
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError("This Player ID is already taken. Try another.");
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "Email/Password authentication is disabled in your Firebase Console. Please go to: " +
          "https://console.firebase.google.com/project/gen-lang-client-0556266159/authentication/providers " +
          "and enable the 'Email/Password' sign-in provider."
        );
      } else {
        setAuthError(err.message || "An authentication fault occurred.");
      }
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, "users", res.user.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      } else {
        // Create profile for Google user
        const baseUsername = res.user.email ? res.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") : `player_${res.user.uid.slice(0, 5)}`;
        const newProfile: UserProfile = {
          uid: res.user.uid,
          username: baseUsername.toLowerCase(),
          displayName: res.user.displayName || `Player_${res.user.uid.slice(0, 5)}`,
          allTimeWins: 0,
          allTimeLosses: 0,
          tournamentsPlayed: 0,
          totalEarnings: 0,
          totalBuyIns: 1,
          isAdmin: baseUsername.toLowerCase() === "admin",
        };
        await setDoc(doc(db, "users", res.user.uid), newProfile);
        setUser(newProfile);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "An authentication fault occurred with Google Sign-In.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // TOURNAMENT / LOBBY BUILD OPERATIONS
  const handleCreateLobby = async () => {
    if (!user) return;
    setActionError(null);
    if (!lobbyNameInput.trim()) {
      setActionError("Lobby needs a name.");
      return;
    }

    const code = Math.random().toString(36).substring(2, 7).toUpperCase(); // e.g. ABCDE
    const newLobby: Lobby = {
      id: code,
      name: lobbyNameInput.trim(),
      status: "lobby",
      hostId: user.uid,
      hostName: user.displayName,
      startingChips: 2000,
      currentSB: 10,
      currentBB: 20,
      currentLevel: 1,
      blindLevelMinutes: 15,
      blindsTimerStartedAt: null,
      blindsTimerPaused: true,
      pausedRemainingSeconds: 15 * 60,
      activeRound: "waiting",
      dealerIndex: 0,
      currentTurnPlayerId: null,
      pot: 0,
      roundPot: 0,
      communityCards: [],
      minRaise: 20,
      lastBetAmount: 0,
      lastBettorId: null,
      showdownRevealed: false,
      winnerAnnouncement: null,
      playersCount: 0,
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "lobbies", code), newLobby);
      setCurrentLobbyId(code);
      setActiveScreen("poker_room");
      setLobbyNameInput("");
      
      // Seed initial chat alert
      await addDoc(collection(db, "lobbies", code, "messages"), {
        id: "sys-init",
        senderId: "system",
        senderName: "System",
        text: `Welcome to the private poker tournament "${newLobby.name}"! Share Room code [${code}] with friends to join.`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(err);
      setActionError("Failed to instantiate lobby. Try again.");
    }
  };

  const handleJoinLobby = async () => {
    if (!user) return;
    setActionError(null);
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length < 3) {
      setActionError("Enter a valid room code.");
      return;
    }

    try {
      const lobbySnap = await getDoc(doc(db, "lobbies", code));
      if (!lobbySnap.exists()) {
        setActionError(`No poker lobby found with code [${code}].`);
        return;
      }

      setCurrentLobbyId(code);
      setActiveScreen("poker_room");
      setJoinCodeInput("");
    } catch (err) {
      console.error(err);
      setActionError("Search failure. Check connection.");
    }
  };

  // ACTIVE POKER ROUND ACTIONS
  const handleSeatClaim = async (seatIdx: number) => {
    if (!user || !currentLobbyId || !lobby) return;

    // Check if player is already seated
    const alreadySeated = players.find((p) => p.id === user.uid);
    if (alreadySeated) {
      alert("You are already seated at Seat #" + (alreadySeated.seatIndex + 1));
      return;
    }

    const startingChipsVal = lobby.startingChips;

    const newPlayer: PlayerState = {
      id: user.uid,
      name: user.displayName,
      chips: startingChipsVal,
      chipsCount: startingChipsVal,
      buyInCount: 1,
      status: "active",
      cards: [],
      currentRoundBet: 0,
      seatIndex: seatIdx,
      lastAction: "None",
      emojiBlast: null,
      joinedAt: Date.now(),
      showCards: false,
    };

    try {
      await setDoc(doc(db, "lobbies", currentLobbyId, "players", user.uid), newPlayer);
      await updateDoc(doc(db, "lobbies", currentLobbyId), {
        playersCount: players.length + 1,
      });

      // System notification
      await addChatMessage("system", "System", `${user.displayName} sat down at Seat #${seatIdx + 1}!`);
      
      // Update tournaments played
      await updateDoc(doc(db, "users", user.uid), {
        tournamentsPlayed: (user.tournamentsPlayed || 0) + 1,
        totalBuyIns: (user.totalBuyIns || 0) + startingChipsVal,
      });

      // Log transaction
      await logTransaction("buyin", `${user.displayName} bought in for ${startingChipsVal} chips`, user.uid, user.displayName, startingChipsVal, 0, startingChipsVal);

    } catch (err) {
      console.error("Error claiming seat:", err);
    }
  };

  const handleToggleShowCards = async (show: boolean) => {
    if (!user || !currentLobbyId) return;
    try {
      await updateDoc(doc(db, "lobbies", currentLobbyId, "players", user.uid), {
        showCards: show,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmoji = async (emoji: string) => {
    if (!user || !currentLobbyId) return;
    try {
      // Set emoji blast which PokerTable listens to for floating animation
      await updateDoc(doc(db, "lobbies", currentLobbyId, "players", user.uid), {
        emojiBlast: {
          emoji,
          timestamp: Date.now(),
        },
      });

      // Clear emoji blast after 2.5s locally via a firestore timeout so it can be blasted again
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, "lobbies", currentLobbyId, "players", user.uid), {
            emojiBlast: null,
          });
        } catch (e) {}
      }, 2500);

    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !currentLobbyId) return;
    await addChatMessage(user.uid, user.displayName, text, user.isAdmin);
  };

  const addChatMessage = async (senderId: string, senderName: string, text: string, isAdmin = false) => {
    if (!currentLobbyId) return;
    try {
      await addDoc(collection(db, "lobbies", currentLobbyId, "messages"), {
        id: Math.random().toString(36).substring(2, 10),
        senderId,
        senderName,
        text,
        timestamp: Date.now(),
        isAdmin,
      });
    } catch (err) {
      console.error("Chat send error:", err);
    }
  };

  const logTransaction = async (
    type: GameTransaction["type"],
    details: string,
    playerId: string | null,
    playerName: string | null,
    amount: number,
    chipsBefore: number,
    chipsAfter: number
  ) => {
    if (!currentLobbyId) return;
    try {
      const txId = Math.random().toString(36).substring(2, 15).toUpperCase();
      const tx: GameTransaction = {
        id: txId,
        timestamp: Date.now(),
        type,
        details,
        playerId,
        playerName,
        amount,
        chipsBefore,
        chipsAfter,
      };
      await setDoc(doc(db, "lobbies", currentLobbyId, "transactions", txId), tx);
    } catch (err) {
      console.error("Transaction logging error:", err);
    }
  };

  // MAIN GAME CHOREOGRAPHER ACTIONS (HOST-ONLY GENERATORS)
  const triggerDealHand = async () => {
    if (!currentLobbyId || !lobby || players.length < 2) {
      alert("At least 2 players must be seated to start the game.");
      return;
    }

    const activeSeated = players.filter((p) => p.status !== "out");
    if (activeSeated.length < 2) {
      alert("At least 2 non-eliminated players must be active.");
      return;
    }

    // Standard Deck Generation and Shuffle
    const SUITS = ["s", "h", "d", "c"];
    const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck: string[] = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push(r + s);
      }
    }
    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Determine Dealer, Small Blind (SB) and Big Blind (BB) seating indices
    const currentDealerIdx = (lobby.dealerIndex + 1) % players.length;
    
    // Find active indices
    const activePlayersIndices = players
      .map((p, idx) => ({ p, idx }))
      .filter((item) => item.p.status !== "out");

    const sbIndex = (currentDealerIdx + 1) % activePlayersIndices.length;
    const bbIndex = (currentDealerIdx + 2) % activePlayersIndices.length;

    const sbPlayer = activePlayersIndices[sbIndex].p;
    const bbPlayer = activePlayersIndices[bbIndex].p;

    const actualSB = Math.min(sbPlayer.chipsCount, lobby.currentSB);
    const actualBB = Math.min(bbPlayer.chipsCount, lobby.currentBB);

    // Batch database updates
    const batch = writeBatch(db);

    // Deal 2 cards to each active player
    let deckIdx = 0;
    for (const playerItem of activePlayersIndices) {
      const card1 = deck[deckIdx++];
      const card2 = deck[deckIdx++];
      
      const pRef = doc(db, "lobbies", currentLobbyId, "players", playerItem.p.id);
      
      let finalBet = 0;
      let newStack = playerItem.p.chipsCount;

      if (playerItem.p.id === sbPlayer.id) {
        finalBet = actualSB;
        newStack -= actualSB;
      } else if (playerItem.p.id === bbPlayer.id) {
        finalBet = actualBB;
        newStack -= actualBB;
      }

      batch.update(pRef, {
        cards: [card1, card2],
        status: "active",
        currentRoundBet: finalBet,
        chipsCount: newStack,
        lastAction: playerItem.p.id === sbPlayer.id ? "SB" : playerItem.p.id === bbPlayer.id ? "BB" : "None",
        showCards: false,
      });
    }

    // Pre-calculate community cards (Flop + Turn + River)
    const communityPool = [deck[deckIdx++], deck[deckIdx++], deck[deckIdx++], deck[deckIdx++], deck[deckIdx++]];

    // Determine first turn player (left of Big Blind)
    const firstTurnIndex = (bbIndex + 1) % activePlayersIndices.length;
    const turnPlayer = activePlayersIndices[firstTurnIndex].p;

    // Update Lobby State
    const lobbyRef = doc(db, "lobbies", currentLobbyId);
    batch.update(lobbyRef, {
      activeRound: "preflop",
      dealerIndex: currentDealerIdx,
      currentTurnPlayerId: turnPlayer.id,
      pot: 0,
      roundPot: actualSB + actualBB,
      communityCards: [], // hidden in preflop
      minRaise: lobby.currentBB,
      lastBetAmount: lobby.currentBB,
      lastBettorId: bbPlayer.id,
      showdownRevealed: false,
      winnerAnnouncement: null,
    });

    await batch.commit();

    // Log the event
    await addChatMessage("system", "System", `♠️ Fresh hand dealt by host! Blinds: Small Blind ${sbPlayer.name} ($${actualSB}), Big Blind ${bbPlayer.name} ($${actualBB}).`);
    await logTransaction("blind", `Small Blind placed by ${sbPlayer.name}`, sbPlayer.id, sbPlayer.name, -actualSB, sbPlayer.chipsCount, sbPlayer.chipsCount - actualSB);
    await logTransaction("blind", `Big Blind placed by ${bbPlayer.name}`, bbPlayer.id, bbPlayer.name, -actualBB, bbPlayer.chipsCount, bbPlayer.chipsCount - actualBB);
  };

  const handlePlaceAction = async (actionType: "Fold" | "Check" | "Call" | "Raise" | "All-in", raiseAmount = 0) => {
    if (!currentLobbyId || !lobby || !user) return;

    const playerProfile = players.find((p) => p.id === user.uid);
    if (!playerProfile || playerProfile.status !== "active") return;

    // Run within a transaction to maintain total state integrity
    try {
      await runTransaction(db, async (transaction) => {
        const lobbyRef = doc(db, "lobbies", currentLobbyId);
        const playerRef = doc(db, "lobbies", currentLobbyId, "players", user.uid);

        const lobbySnap = await transaction.get(lobbyRef);
        const playerSnap = await transaction.get(playerRef);

        if (!lobbySnap.exists() || !playerSnap.exists()) return;

        const currentLobby = lobbySnap.data() as Lobby;
        const currentPlayer = playerSnap.data() as PlayerState;

        let chipsChange = 0;
        let newPlayerBet = currentPlayer.currentRoundBet;
        let finalActionLabel = actionType;

        if (actionType === "Fold") {
          transaction.update(playerRef, {
            status: "folded",
            lastAction: "Fold",
          });
        } else if (actionType === "Check") {
          transaction.update(playerRef, {
            lastAction: "Check",
          });
        } else if (actionType === "Call") {
          const costToCall = currentLobby.lastBetAmount - currentPlayer.currentRoundBet;
          chipsChange = Math.min(currentPlayer.chipsCount, costToCall);
          newPlayerBet += chipsChange;
          
          transaction.update(playerRef, {
            chipsCount: currentPlayer.chipsCount - chipsChange,
            currentRoundBet: newPlayerBet,
            lastAction: "Call",
          });
        } else if (actionType === "Raise") {
          const addedChips = raiseAmount - currentPlayer.currentRoundBet;
          chipsChange = addedChips;
          newPlayerBet = raiseAmount;

          transaction.update(playerRef, {
            chipsCount: currentPlayer.chipsCount - chipsChange,
            currentRoundBet: newPlayerBet,
            lastAction: `Raise ${raiseAmount}`,
          });

          transaction.update(lobbyRef, {
            lastBetAmount: raiseAmount,
            lastBettorId: currentPlayer.id,
          });
        } else if (actionType === "All-in") {
          chipsChange = currentPlayer.chipsCount;
          newPlayerBet += chipsChange;

          transaction.update(playerRef, {
            chipsCount: 0,
            currentRoundBet: newPlayerBet,
            lastAction: "All-in",
          });

          if (newPlayerBet > currentLobby.lastBetAmount) {
            transaction.update(lobbyRef, {
              lastBetAmount: newPlayerBet,
              lastBettorId: currentPlayer.id,
            });
          }
        }

        // Adjust pot counts
        if (chipsChange > 0) {
          transaction.update(lobbyRef, {
            roundPot: currentLobby.roundPot + chipsChange,
          });
        }

        // Calculate next player clockwise
        const activeSeated = players.filter((p) => p.status === "active");
        const currentActiveIdx = activeSeated.findIndex((p) => p.id === user.uid);
        let nextPlayerId = null;

        if (activeSeated.length > 1) {
          const nextActive = activeSeated[(currentActiveIdx + 1) % activeSeated.length];
          nextPlayerId = nextActive.id;
        }

        transaction.update(lobbyRef, {
          currentTurnPlayerId: nextPlayerId,
        });
      });

      // Simple real-time game logs
      await addChatMessage("system", "System", `${user.displayName} performed action: ${actionType} ${raiseAmount > 0 ? raiseAmount : ""}`);
      
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  // ADMIN OPERATIONS
  const handleUpdateLobby = async (updates: Partial<Lobby>) => {
    if (!currentLobbyId) return;
    try {
      await updateDoc(doc(db, "lobbies", currentLobbyId), updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlayerProfile = async (name: string, chips: number) => {
    if (!currentLobbyId) return;
    const localId = `local_${Math.random().toString(36).substring(2, 9)}`;
    const newPlayer: PlayerState = {
      id: localId,
      name,
      chips,
      chipsCount: chips,
      buyInCount: 1,
      status: "active",
      cards: [],
      currentRoundBet: 0,
      seatIndex: players.length, // auto seat at next index
      lastAction: "None",
      emojiBlast: null,
      joinedAt: Date.now(),
      showCards: false,
    };

    try {
      await setDoc(doc(db, "lobbies", currentLobbyId, "players", localId), newPlayer);
      await addChatMessage("system", "System", `Host created profile for offline player "${name}" and seated them.`);
      await logTransaction("buyin", `Host created profile for ${name} with starting ${chips} chips`, localId, name, chips, 0, chips);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustPlayerChips = async (playerId: string, adjustment: number) => {
    if (!currentLobbyId) return;
    try {
      const pRef = doc(db, "lobbies", currentLobbyId, "players", playerId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const currentData = pSnap.data() as PlayerState;
        const newChips = Math.max(0, currentData.chipsCount + adjustment);
        await updateDoc(pRef, {
          chipsCount: newChips,
        });

        await addChatMessage("system", "System", `Host adjusted ${currentData.name}'s stack by ${adjustment > 0 ? "+" : ""}${adjustment} chips.`);
        await logTransaction("admin_adjustment", `Host manual chips adjustment for ${currentData.name}`, playerId, currentData.name, adjustment, currentData.chipsCount, newChips);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyInPlayer = async (playerId: string) => {
    if (!currentLobbyId || !lobby) return;
    try {
      const pRef = doc(db, "lobbies", currentLobbyId, "players", playerId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const currentData = pSnap.data() as PlayerState;
        const addedVal = lobby.startingChips;
        const newCount = currentData.chipsCount + addedVal;
        await updateDoc(pRef, {
          chipsCount: newCount,
          buyInCount: (currentData.buyInCount || 1) + 1,
          status: "active",
        });

        await addChatMessage("system", "System", `${currentData.name} completed a Re-Buy (+${addedVal} starting chips).`);
        await logTransaction("rebuy", `${currentData.name} completed Re-buy`, playerId, currentData.name, addedVal, currentData.chipsCount, newCount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminatePlayer = async (playerId: string) => {
    if (!currentLobbyId) return;
    try {
      await updateDoc(doc(db, "lobbies", currentLobbyId, "players", playerId), {
        status: "out",
        chipsCount: 0,
        cards: [],
      });
      
      const pSnap = await getDoc(doc(db, "lobbies", currentLobbyId, "players", playerId));
      const pName = pSnap.exists() ? (pSnap.data() as PlayerState).name : "Player";

      await addChatMessage("system", "System", `${pName} has been eliminated from the session.`);
      await logTransaction("payout", `${pName} eliminated from tournament`, playerId, pName, 0, 0, 0);

      // Track losses
      await updateDoc(doc(db, "users", playerId), {
        allTimeLosses: (user?.allTimeLosses || 0) + 1,
      });

    } catch (err) {
      console.error(err);
    }
  };

  const handleAwardPot = async (playerId: string) => {
    if (!currentLobbyId || !lobby) return;

    const winner = players.find((p) => p.id === playerId);
    if (!winner) return;

    const totalAwardChips = lobby.pot + lobby.roundPot;
    if (totalAwardChips <= 0) {
      alert("Active pot size is empty.");
      return;
    }

    try {
      // Award chips
      const pRef = doc(db, "lobbies", currentLobbyId, "players", playerId);
      const newChipsCount = winner.chipsCount + totalAwardChips;
      await updateDoc(pRef, {
        chipsCount: newChipsCount,
      });

      // Reset lobby pot indicators
      await updateDoc(doc(db, "lobbies", currentLobbyId), {
        pot: 0,
        roundPot: 0,
        activeRound: "waiting",
        communityCards: [],
        currentTurnPlayerId: null,
        winnerAnnouncement: `${winner.name} wins pot of ${totalAwardChips} chips! 🏆`,
      });

      await addChatMessage("system", "System", `🏆 Pot of ${totalAwardChips} awarded to ${winner.name}!`);
      await logTransaction("pot_won", `${winner.name} won the main pot`, playerId, winner.name, totalAwardChips, winner.chipsCount, newChipsCount);

      // Track win statistics
      await updateDoc(doc(db, "users", playerId), {
        allTimeWins: (user?.allTimeWins || 0) + 1,
        totalEarnings: (user?.totalEarnings || 0) + totalAwardChips,
      });

    } catch (err) {
      console.error(err);
    }
  };

  const triggerAdvanceBlinds = async () => {
    if (!currentLobbyId || !lobby) return;

    const nextSB = lobby.currentSB * 2;
    const nextBB = lobby.currentBB * 2;
    const nextLevel = lobby.currentLevel + 1;

    try {
      await updateDoc(doc(db, "lobbies", currentLobbyId), {
        currentLevel: nextLevel,
        currentSB: nextSB,
        currentBB: nextBB,
        blindsTimerStartedAt: Date.now(), // Reset timer
        pausedRemainingSeconds: lobby.blindLevelMinutes * 60,
      });

      await addChatMessage("system", "System", `⏰ Blinds structure raised to Level ${nextLevel}: SB ${nextSB} / BB ${nextBB}!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetTournament = async () => {
    if (!currentLobbyId || !lobby) return;

    try {
      // Reset players stacks to default starting stack
      const batch = writeBatch(db);
      for (const p of players) {
        batch.update(doc(db, "lobbies", currentLobbyId, "players", p.id), {
          chipsCount: lobby.startingChips,
          buyInCount: 1,
          status: "active",
          cards: [],
          currentRoundBet: 0,
          lastAction: "None",
          showCards: false,
        });
      }

      batch.update(doc(db, "lobbies", currentLobbyId), {
        activeRound: "waiting",
        pot: 0,
        roundPot: 0,
        communityCards: [],
        dealerIndex: 0,
        currentTurnPlayerId: null,
        winnerAnnouncement: null,
        currentLevel: 1,
        currentSB: 10,
        currentBB: 20,
        blindsTimerPaused: true,
        pausedRemainingSeconds: lobby.blindLevelMinutes * 60,
        blindsTimerStartedAt: null,
      });

      await batch.commit();
      await addChatMessage("system", "System", `🚨 Tournament reset by host. Defaulting player stacks, resetting blinds clock.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextBoardStage = async () => {
    if (!currentLobbyId || !lobby) return;

    // Preflop community pool mapping
    const cardPool = ["As", "Kd", "Qh", "Jc", "10s"]; // demo card set for board stage demo
    let nextStage: Lobby["activeRound"] = "waiting";
    let cardsToShow: string[] = [];

    if (lobby.activeRound === "preflop") {
      nextStage = "flop";
      cardsToShow = [cardPool[0], cardPool[1], cardPool[2]];
    } else if (lobby.activeRound === "flop") {
      nextStage = "turn";
      cardsToShow = [...lobby.communityCards, cardPool[3]];
    } else if (lobby.activeRound === "turn") {
      nextStage = "river";
      cardsToShow = [...lobby.communityCards, cardPool[4]];
    } else if (lobby.activeRound === "river") {
      nextStage = "showdown";
      cardsToShow = lobby.communityCards;
    }

    try {
      await updateDoc(doc(db, "lobbies", currentLobbyId), {
        activeRound: nextStage,
        communityCards: cardsToShow,
        roundPot: 0,
        pot: lobby.pot + lobby.roundPot,
        lastBetAmount: 0,
        lastBettorId: null,
      });

      // Clear player current round bets
      const batch = writeBatch(db);
      for (const p of players) {
        batch.update(doc(db, "lobbies", currentLobbyId, "players", p.id), {
          currentRoundBet: 0,
        });
      }
      await batch.commit();

      await addChatMessage("system", "System", `Board advanced to stage: ${nextStage.toUpperCase()}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Rules overlay button visible on all views */}
      <RulesModal />

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-950/20">
            ♦
          </div>
          <div>
            <h1 className="text-sm font-black font-sans tracking-tight text-white uppercase flex items-center gap-1.5">
              Private Poker Club <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">v1.2</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              Secure real-time multiplayer companion
            </p>
          </div>
        </div>

        {/* User login / status */}
        {user && (
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-bold text-slate-200">{user.displayName}</span>
              <span className="text-[10px] text-slate-500">@{user.username}</span>
            </div>
            
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3.5 py-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl font-bold tracking-wide transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Primary Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        
        {/* VIEW A: Login / Screen Authentication */}
        {!user ? (
          <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center bg-slate-950/50 border-b border-slate-800/60">
              <span className="text-4xl text-emerald-400 select-none">🃏</span>
              <h2 className="text-xl font-bold text-slate-100 font-sans tracking-tight mt-3">
                Welcome to the Felt
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Join private games or configure real-time tournaments. Sign in or create a player ID below.
              </p>
            </div>

            <form onSubmit={handleAuth} className="p-8 space-y-4 text-xs">
              {authError && (
                <div className="p-3 bg-red-900/15 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="font-semibold leading-normal">{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">Player ID / Username</label>
                <input
                  id="auth-login-id"
                  type="text"
                  placeholder="e.g. janesmith"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {isRegistering && (
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">Screen Display Name</label>
                  <input
                    id="auth-display-name"
                    type="text"
                    placeholder="e.g. Jane S."
                    value={loginDisplayName}
                    onChange={(e) => setLoginDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">Access Password</label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/20 text-center"
              >
                {isRegistering ? "Create Profile Account" : "Access Poker Room"}
              </button>

              <div className="text-center pt-2">
                <button
                  id="toggle-auth-mode"
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {isRegistering ? "Already have a profile ID? Log in" : "Need a player profile ID? Register here"}
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 font-bold">or</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                id="auth-google-btn"
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>
        ) : activeScreen === "lobby_home" ? (
          
          // VIEW B: HOME LOBBY SELECTION / LEADERBOARD
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Create or Join Lobby */}
              <div className="space-y-6">
                
                {/* Lobby management card */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Start playing Poker
                  </h3>

                  {actionError && (
                    <div className="p-3 bg-red-950/15 border border-red-500/20 text-red-400 rounded-xl">
                      {actionError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Create New Private Lobby */}
                    <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-200">Create Private Tournament</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Set starting chips, customize blind multipliers, and receive invite keys.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <input
                          id="lobby-name-input"
                          type="text"
                          placeholder="Lobby name (e.g. Friday Classic)..."
                          value={lobbyNameInput}
                          onChange={(e) => setLobbyNameInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50"
                        />
                        <button
                          id="create-lobby-btn"
                          onClick={handleCreateLobby}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                        >
                          Host Tournament
                        </button>
                      </div>
                    </div>

                    {/* Join Lobby via Code */}
                    <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-200">Join Private Room</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Enter the 5-character invitation room code shared by your friends.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <input
                          id="join-code-input"
                          type="text"
                          placeholder="Code (e.g. POKER)..."
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 font-mono tracking-widest uppercase text-center"
                        />
                        <button
                          id="join-lobby-btn"
                          onClick={handleJoinLobby}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                        >
                          Join Table
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account overview / stats card */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Seated Account stats
                    </span>
                    <h4 className="text-sm font-bold text-slate-100">
                      {user.displayName}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      All-time wins: <span className="text-yellow-500 font-bold">{user.allTimeWins || 0}</span> | Loss early out: <span className="text-slate-500">{user.allTimeLosses || 0}</span>
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Total Earnings
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {(user.totalEarnings || 0).toLocaleString()} <span className="text-[10px] text-slate-500">chips</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Leaderboard */}
              <div className="lg:col-span-1">
                <Leaderboard
                  users={leaderboardUsers}
                  loading={leaderboardLoading}
                  onRefresh={fetchLeaderboard}
                />
              </div>
            </div>
          </div>
        ) : (
          
          // VIEW C: ACTIVE POKER TABLE ROOM
          <div className="space-y-6">
            
            {/* Table Navigation Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="back-to-lobby-btn"
                  onClick={() => {
                    setCurrentLobbyId(null);
                    setActiveScreen("lobby_home");
                  }}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Room: {lobby?.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    Code: <span className="font-mono font-bold text-emerald-400">{lobby?.id}</span> 
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}?lobby=${lobby?.id}`;
                        navigator.clipboard.writeText(link);
                        alert("Invite link copied to clipboard: " + link);
                      }}
                      className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-2.5 h-2.5" /> Invite Link
                    </button>
                  </p>
                </div>
              </div>

              {/* Game State Control Panel (For active playing hands) */}
              <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end text-xs font-semibold">
                
                {/* Blinds Level countdown display */}
                <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                  <span className="font-mono text-slate-200">
                    Blinds {lobby?.currentSB}/{lobby?.currentBB}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    | {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Host Controls for dealing / advancing rounds */}
                {user && lobby && user.uid === lobby.hostId && (
                  <div className="flex gap-1.5">
                    {/* Deal Hand button (Preflop) */}
                    {lobby.activeRound === "waiting" && (
                      <button
                        id="host-deal-hand-btn"
                        onClick={triggerDealHand}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-950/20 text-xs"
                      >
                        Deal Fresh Hand
                      </button>
                    )}

                    {/* Step betting rounds */}
                    {lobby.activeRound !== "waiting" && lobby.activeRound !== "showdown" && (
                      <button
                        id="host-next-round-btn"
                        onClick={handleNextBoardStage}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer shadow text-xs"
                      >
                        Advance Round
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
              
              {/* Felt Arena Center (takes 3 of 4 columns) */}
              <div className="lg:col-span-3">
                <PokerTable
                  lobby={lobby!}
                  players={players}
                  currentUserId={user.uid}
                  onPlaceAction={handlePlaceAction}
                  onSeatClaim={handleSeatClaim}
                  onToggleShowCards={handleToggleShowCards}
                />
              </div>

              {/* Chat & Emoji Selection columns (takes 1 column) */}
              <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
                
                {/* Emoji blast selectors */}
                <EmojiSelector
                  onSendEmoji={handleSendEmoji}
                  disabled={!players.find((p) => p.id === user.uid)}
                />

                {/* Active Chat box */}
                <ChatBox
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  currentUserDisplayName={user.displayName}
                />
              </div>
            </div>

            {/* Bottom: Tournament Analytics panel */}
            {lobby && players.length > 0 && (
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Tournament Health & Analytics Dashboard
                </h4>
                <AnalyticsPanel
                  lobby={lobby}
                  players={players}
                />
              </div>
            )}

            {/* Bottom-Most Host Management Panel */}
            {user && lobby && user.uid === lobby.hostId && (
              <div className="p-6 bg-slate-950/40 border border-slate-850 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Host Director Dashboard
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      You are hosting this tournament. Oversee table actions, resolve stacks, and edit blind timer configurations.
                    </p>
                  </div>
                </div>

                <AdminPanel
                  lobby={lobby}
                  players={players}
                  transactions={transactions}
                  onUpdateLobby={handleUpdateLobby}
                  onAddPlayerProfile={handleAddPlayerProfile}
                  onAdjustPlayerChips={handleAdjustPlayerChips}
                  onBuyInPlayer={handleBuyInPlayer}
                  onEliminatePlayer={handleEliminatePlayer}
                  onResetTournament={handleResetTournament}
                  onAwardPot={handleAwardPot}
                  onAdvanceBlinds={triggerAdvanceBlinds}
                />
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
