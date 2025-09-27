import express from "express";
import cors from "cors";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { Telegraf } from "telegraf";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyArmHweHZp3sOM2FMI61Sm-obTHTAK1sbE",
  authDomain: "halalmusic-1c5e3.firebaseapp.com",
  projectId: "halalmusic-1c5e3",
  storageBucket: "halalmusic-1c5e3.firebasestorage.app",
  messagingSenderId: "469402288671",
  appId: "1:469402288671:web:5d68b4a5211b8ccd314b2a"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Telegram Bot
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

bot.on("audio", async (ctx) => {
  const fileName = ctx.message.audio.file_name || "unknown.mp3";
  const fileUrl = await ctx.telegram.getFileLink(ctx.message.audio.file_id);

  // Firestore এ গান সংরক্ষণ
  await addDoc(collection(db, "songs"), {
    title: fileName,
    url: fileUrl.href
  });

  await ctx.reply("✅ Uploaded to Firebase!");
});

bot.launch();

// Frontend থেকে গান নেওয়ার API
app.get("/songs", async (req, res) => {
  const querySnapshot = await getDocs(collection(db, "songs"));
  const songs = querySnapshot.docs.map(doc => doc.data());
  res.json(songs);
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
