const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
mongoose
  .connect(require("./config.json").mongo, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`\x1b[31mあ -> \x1b[0m MONGOOSE CONNECT. ✅`))
  .catch((error) => console.log(error));

const links = mongoose.model("links", {
  state: { type: String, required: true },
  invoiceID: { type: String, required: true },
  type: { type: String, required: true },
  count: { type: Number, required: true },
  bot_token: { type: String, required: true },
  used: { type: Boolean, default: false },
  create_inf: {
    owner_id: { type: String, required: true },
    bot_id: { type: String, required: true },
    time: { type: String, required: true },
  },
  user_bought: { type: String },
  channel_id: { type: String },
  guild: { type: String },
  timeUsed: { type: String },
  removed: { type: Boolean, default: false },
  user_removed: { type: String },
});

const tokens = mongoose.model("tokens", {
  discordId: { type: String, required: true },
    email: { type: String },
    password: { type: String },
    token: { type: String },
    type: { type: String, required: true },
    token_redirect: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    refreshDate: { type: Date, default: new Date() },
    limitServer: { type: Boolean, default: false },
    nitrada: { type: Boolean, default: false },
    badtoken: { type: Boolean, default: false }
});

module.exports = { links, tokens };