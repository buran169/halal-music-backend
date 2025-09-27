const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

// Telegram Bot Token (environment variable)
const BOT_TOKEN = process.env.BOT_TOKEN;
if(!BOT_TOKEN){
  console.error("❌ BOT_TOKEN not set in environment variables!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Ensure folders/files exist
const publicDir = path.join(__dirname, 'public');
const songsFolder = path.join(publicDir, 'songs');
const songsJsonFile = path.join(publicDir, 'songs.json');

if(!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if(!fs.existsSync(songsFolder)) fs.mkdirSync(songsFolder);
if(!fs.existsSync(songsJsonFile)) fs.writeFileSync(songsJsonFile, '[]');

// Serve static files
app.use(express.static(publicDir));

// Root route → serve index.html
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if(fs.existsSync(indexPath)){
    res.sendFile(indexPath);
  } else {
    res.send('<h1>Frontend index.html not found!</h1>');
  }
});

// Songs API
app.get('/songs', (req, res) => {
  const songs = JSON.parse(fs.readFileSync(songsJsonFile, 'utf8'));
  res.json(songs);
});

// Telegram Bot → listen for audio & mp3 document
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

    // Telegram file URL
    const file = await ctx.telegram.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Download & save
    const localPath = path.join(songsFolder, fileName);
    const writer = fs.createWriteStream(localPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log(`File saved: ${localPath}`);
      // Update songs.json
      let songs = JSON.parse(fs.readFileSync(songsJsonFile, 'utf8'));
      songs.push({
        title,
        artist: ctx.message.from.first_name,
        url: `/songs/${fileName}`,
        albumCover: "https://via.placeholder.com/100"
      });
      fs.writeFileSync(songsJsonFile, JSON.stringify(songs, null, 2));
    });

    ctx.reply("✅ Uploaded successfully!");
  } catch(err){
    console.error(err);
    ctx.reply("❌ Error uploading file!");
  }
});

// Start Telegram Bot
bot.launch().then(() => console.log("Bot launched successfully!"));

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
