require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy } = require('firebase/firestore');

// ---------- Telegram Bot ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
if(!BOT_TOKEN){
    console.error("❌ BOT_TOKEN not set!");
    process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// ---------- Firebase ----------
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

// ---------- Express Server ----------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // public folder serve

const PORT = process.env.PORT || 3000;

// ---------- API: Get all songs ----------
app.get('/songs', async (req,res)=>{
    try{
        const songsCol = collection(db, "songs");
        const q = query(songsCol, orderBy("title"));
        const snapshot = await getDocs(q);
        const songs = snapshot.docs.map(doc => doc.data());
        res.json(songs);
    } catch(err){
        console.error("❌ Fetch songs error:", err.message);
        res.status(500).json({error:"Failed to fetch songs"});
    }
});

// ---------- Telegram: Handle Audio Forward ----------
bot.on('audio', async (ctx)=>{
    try{
        const file = ctx.message.audio;
        const title = file.file_name || "Unknown";
        const fileId = file.file_id;
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileId}`; // direct file URL

        // Save to Firestore
        await addDoc(collection(db, "songs"), {
            title: title,
            url: fileUrl
        });

        await ctx.reply(`✅ Saved "${title}"`);
        console.log(`Saved "${title}" to Firestore`);
    } catch(err){
        console.error("❌ Bot audio handler error:", err.message);
        await ctx.reply("❌ Failed to save song.");
    }
});

// ---------- Start Server ----------
app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});

// ---------- Launch Telegram Bot ----------
bot.launch().then(()=>console.log("Bot launched"));
