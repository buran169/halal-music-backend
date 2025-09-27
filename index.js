// index.js
const express = require("express");
const cors = require("cors");
const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Firebase (CommonJS)
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs } = require("firebase/firestore");

// Express setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Telegram Bot Token from Environment
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not set!");
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// Firebase Config from Environment
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_PROJECT_ID + ".firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Telegram audio handler
bot.on("audio", async (ctx) => {
  try {
    const file = ctx.message.audio;
    const title = file.title || file.file_name || "Unknown";

    // Telegram file URL
    const fileLink = await ctx.telegram.getFileLink(file.file_id);

    // Save song info to Firebase Firestore
    await addDoc(collection(db, "songs"), {
      title: title,
      url: fileLink.href
    });

    await ctx.reply(`✅ Uploaded to Firebase: ${title}`);
    console.log("✅ Added:", title);
  } catch (err) {
    console.error("❌ Error adding song:", err.message);
    ctx.reply("❌ Failed to upload song!");
  }
});

// API for frontend
app.get("/songs", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "songs"));
    const songs = querySnapshot.docs.map(doc => doc.data());
    res.json(songs);
  } catch (err) {
    console.error("❌ Error fetching songs:", err.message);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Start server & bot
bot.launch();
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
