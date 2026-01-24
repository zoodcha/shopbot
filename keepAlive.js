const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive 🚀");
});

function keepAlive() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("Keep-alive server running");
  });
}

module.exports = keepAlive;
