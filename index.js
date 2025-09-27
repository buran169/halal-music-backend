import express from "express";
import cors from "cors";
import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Environment variables missing!");
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

// Bot command: forward song
bot.on("voice", async (ctx) => {
  try {
    const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const title = ctx.message.caption || "Untitled Song";

    // Save to Supabase
    const { data, error } = await supabase.from("songs").insert([{ title, url: fileLink.href }]);
    if (error) throw error;

    ctx.reply(`✅ Song saved: ${title}`);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Failed to save song.");
  }
});

bot.launch();

// Express endpoint: fetch songs
app.get("/songs", async (req, res) => {
  try {
    const { data, error } = await supabase.from("songs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
