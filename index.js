const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const BOT_TOKEN = process.env.BOT_TOKEN;
if(!BOT_TOKEN){
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, 'public');
const songsFolder = path.join(publicDir, 'songs');
const songsJsonFile = path.join(publicDir, 'songs.json');

// Ensure folders/files exist
if(!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if(!fs.existsSync(songsFolder)) fs.mkdirSync(songsFolder);
if(!fs.existsSync(songsJsonFile)) fs.writeFileSync(songsJsonFile, '[]');

// Serve static files
app.use(express.static(publicDir));

// API route to fetch songs.json
app.get('/songs', (req,res)=>{
  const songs = JSON.parse(fs.readFileSync(songsJsonFile,'utf8'));
  res.json(songs);
});

// Bot → receive audio / document
bot.on(['audio','document'], async (ctx)=>{
  try{
    let fileId, fileName, title;
    if(ctx.message.audio){
      fileId = ctx.message.audio.file_id;
      fileName = ctx.message.audio.file_name || ctx.message.audio.title+".mp3";
      title = ctx.message.audio.title || fileName;
    } else if(ctx.message.document && ctx.message.document.mime_type.includes("audio")){
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
      title = fileName;
    } else return ctx.reply("❌ Only audio/mp3 allowed!");

    const file = await ctx.telegram.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Download mp3 to public/songs/
    const localPath = path.join(songsFolder, fileName);
    const writer = fs.createWriteStream(localPath);
    const response = await axios({url, method:'GET', responseType:'stream'});
    response.data.pipe(writer);

    writer.on('finish', ()=>{
      console.log("Saved:", localPath);
      // Update songs.json
      let songs = JSON.parse(fs.readFileSync(songsJsonFile,'utf8'));
      songs.push({title, url: `/songs/${fileName}`});
      fs.writeFileSync(songsJsonFile, JSON.stringify(songs,null,2));
    });

    ctx.reply("✅ Uploaded successfully!");
  }catch(err){
    console.error(err);
    ctx.reply("❌ Error uploading!");
  }
});

// Start Bot
bot.launch().then(()=>console.log("Bot started!"));

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running at http://localhost:${PORT}`));
