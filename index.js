const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

// Telegram Bot Token (set in Render/Replit environment variables)
const BOT_TOKEN = process.env.BOT_TOKEN || "7931123058:AAFntxRe-I3DEKBvvb4XX2Kv3M775zgorME";
const bot = new Telegraf(BOT_TOKEN);

// Express server setup
const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Ensure folders/files exist
const songsFolder = path.join(__dirname, 'public/songs');
const songsJson = path.join(__dirname, 'public/songs.json');

if (!fs.existsSync(songsFolder)) fs.mkdirSync(songsFolder, { recursive: true });
if (!fs.existsSync(songsJson)) fs.writeFileSync(songsJson, "[]");

// Telegram Bot: listen for audio & document (mp3)
bot.on(['audio', 'document'], async (ctx) => {
  try {
    let fileId, fileName, title;

    if(ctx.message.audio){
      fileId = ctx.message.audio.file_id;
      fileName = ctx.message.audio.file_name || ctx.message.audio.title + ".mp3";
      title = ctx.message.audio.title || fileName;
    } else if(ctx.message.document && ctx.message.document.mime_type.includes("audio")){
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
      title = fileName;
    } else {
      return ctx.reply("❌ Only audio/mp3 files allowed!");
    }

    // Get Telegram file URL
    const file = await ctx.telegram.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Download & save locally
    const localPath = path.join(songsFolder, fileName);
    const writer = fs.createWriteStream(localPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log('File saved:', localPath);

      // Update songs.json
      let songs = JSON.parse(fs.readFileSync(songsJson, 'utf8'));
      songs.push({
        title: title,
        artist: ctx.message.from.first_name,
        url: `/songs/${fileName}`,
        albumCover: "https://via.placeholder.com/100"
      });
      fs.writeFileSync(songsJson, JSON.stringify(songs, null, 2));
    });

    ctx.reply("✅ Uploaded successfully!");
  } catch(err){
    console.error(err);
    ctx.reply("❌ Error uploading file!");
  }
});

// Start Telegram Bot
bot.launch();

// Serve frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve songs.json API
app.get('/songs', (req, res) => {
  const songs = JSON.parse(fs.readFileSync(songsJson, 'utf8'));
  res.json(songs);
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
