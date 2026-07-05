/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "gen-lang-client-0556266159",
  appId: "1:3998996522:web:b02f6c379297c6ec6e8b53",
  apiKey: "AIzaSyAXXyALdjmsxyWtL10-hEB3yEuQDhg11WQ",
  authDomain: "gen-lang-client-0556266159.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-privatepokerclub-df8e0376-007c-4bd8-ac14-3969de22a89e",
  storageBucket: "gen-lang-client-0556266159.firebasestorage.app",
  messagingSenderId: "3998996522",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific databaseId assigned during setup
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
