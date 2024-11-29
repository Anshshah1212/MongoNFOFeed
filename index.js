const { config } = require("dotenv");
const mongoose = require("mongoose");
const https = require('https');

config();
async function sendMessage(chatId, text, parseMode) {
    try {
      const apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const maxChunkLength = 4000; // Adjust the chunk size as needed
      const textChunks = [];
      for (let i = 0; i < text.length; i += maxChunkLength) {
        textChunks.push(text.substring(i, i + maxChunkLength));
      }
      for (const chunk of textChunks) {
        const payload = {
          chat_id: chatId,
          text: chunk,
          parse_mode: parseMode,
        };
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
  
async function main() {
  const response = await fetch(
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
  );
  const data = await response.json();
  const angelOneScriptData = {
    ANGELNSE: [],
    ANGELNFO: [],
  };
  data.forEach((obj) => {
    switch (obj.exch_seg) {
      case "NSE":
        angelOneScriptData.ANGELNSE.push(obj);
        break;
      case "NFO":
        angelOneScriptData.ANGELNFO.push(obj);
        break;
    }
  });
  let finalData = [];
  angelOneScriptData.ANGELNSE.forEach((NSEobj) => {
    let obj = {};
    obj.token = NSEobj.token.toString();
    obj.symbol = NSEobj.symbol.toString();
    obj.exch_seg = NSEobj.exch_seg.toString();
    obj.name = NSEobj.name.toString();
    obj.expiry = NSEobj.expiry.toString();
    obj.strike = NSEobj.strike.toString();

    let underlaying = angelOneScriptData.ANGELNFO.filter(
      (NFOobject) => NFOobject.name === obj.name
    );

    obj.underlaying = underlaying;
    if (underlaying.length > 0) {
      finalData.push(obj);
    }
  });

  try {
     // Connect to MongoDB
     await mongoose.connect(process.env.MONGOURL, { // Replace with your connection string
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
  
      // Define a Mongoose schema
      const nseSchema = new mongoose.Schema({
        token: String,
        symbol: String,
        exch_seg: String,
        name: String,
        expiry: String,
        strike: String,
        underlaying: [
          {
            token: String,
            symbol: String,
            exch_seg: String,
            name: String,
            expiry: String,
            strike: String,
            // ... other fields from ANGELNFO as needed
          },
        ],
      });
      const Nse = mongoose.model('Nse', nseSchema); // Create the model
      
      // Delete existing documents before inserting new data
      await Nse.deleteMany({});
  
      // Prepare data for bulk insert
      const bulkOps = finalData.map((obj) => ({
        insertOne: {
          document: obj
        },
      }));
  
  
      // Bulk insert into MongoDB
      const result = await Nse.bulkWrite(bulkOps);
      sendMessage("735656510",`NFO LIST In Ansh DATABASE Inserted ${result.insertedCount} documents`,'Markdown');
  } catch (error) {
    console.error(error);
    sendMessage("735656510",`Error in adding data in ansh mongoDB`,'Markdown');
  } finally {
    mongoose.disconnect();
}

}

main();
