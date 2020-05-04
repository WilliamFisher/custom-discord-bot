require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client({ partials: ['MESSAGE','REACTION'] });
const methods = require("./methods");

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
  if (
    msg.content === "!setupShop" &&
    msg.member.hasPermission("ADMINISTRATOR")
  ) {
    methods.handleSetupShop(msg);
  }
  if (msg.content === "!loot" && msg.member.hasPermission("ADMINISTRATOR")) {
    methods.handleLoot(msg);
  }
  if (
    msg.content.startsWith("!setIndex") &&
    msg.member.hasPermission("ADMINISTRATOR")
  ) {
    methods.handleSetIndex(msg);
  }
  if (msg.content === "!spin") {
    methods.handleSpin(msg);
  }
  if (msg.content === "!ping") {
    methods.handlePing(msg, client);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if(reaction.message.partial) await reaction.message.fetch();
  if (
    reaction.emoji.name === "💚" &&
    reaction.message.author.id === client.user.id
  ) {
    methods.handleReaction(reaction, user, client);
  }
});

client.login(process.env.BOT_TOKEN);
