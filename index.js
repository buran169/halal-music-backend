import express from "express";
import cors from "cors";
import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing environment variables!");
  process.exit(1);
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Telegram Bot setup
const bot = new Telegraf(BOT_TOKEN);

// Bot: forward audio/voice
bot.on(["voice","audio"], async (ctx) => {
  try {
    let fileId;
    if(ctx.message.voice) fileId = ctx.message.voice.file_id;
    else if(ctx.message.audio) fileId = ctx.message.audio.file_id;

   const title = ctx.message.audio.title || ctx.message.audio.file_name || "Unknown Song";
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const { data, error } = await supabase.from("songs").insert([
      { title, url: fileLink.href }
    ]);
    if (error) throw error;

    ctx.reply(`✅ Song successfully saved: ${title}`);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Failed to save song.");
  }
});

bot.launch();

// Express API: fetch songs
app.get("/songs", async (req, res) => {
  try {
    const { data, error } = await supabase.from("songs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
