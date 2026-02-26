/* ========================================
   Firebase Init for Telegram WebApp
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyApSkAZZL9y5fYbF7h8yIaTtssCGNoMMQU",
    authDomain: "nhatroeden.firebaseapp.com",
    projectId: "nhatroeden",
    storageBucket: "nhatroeden.firebasestorage.app",
    messagingSenderId: "287791247707",
    appId: "1:287791247707:web:4e7e4c5fdf239e1a0e2a7e",
    measurementId: "G-ER75LSTRVH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log('[Firebase] 🔥 Initialized for Telegram WebApp');
