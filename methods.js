require("dotenv").config();
const ps = require("pg");
const shopData = require("./categories.json");
const lootboxes = require("./lootboxes.json");

const db = new ps.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

db.connect();

// TODO: Update to store counts in the database.
let donationCount = 1;
let lootBoxIndex = 0;
let suggestChannelId = 0;

const getRandomInt = () => {
  min = Math.ceil(10);
  max = Math.floor(50);

  return Math.floor(Math.random() * (max - min)) + min;
};

const handleReaction = async (reaction, user, client) => {
  if (reaction.message.author.id === user.id) return;
  reaction.users.remove(user.id);
  const channelPermissions = {
    type: "text",
    permissionOverwrites: [
      {
        id: user.id,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"],
      },
      {
        id: reaction.message.guild.roles.everyone,
        deny: ["VIEW_CHANNEL"],
      },
      {
        id: client.user.id,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"],
      },
    ],
  };
  try {
    const channel = await reaction.message.guild.channels.create(
      `donation-${donationCount}`,
      channelPermissions
    );
    donationCount++;
    await channel.send(
      "Hi! Start by typing the category number you would like to purchase from!",
      { reply: user }
    );

    let categoryString = "";
    for (i = 0; i < shopData.length; i++) {
      categoryString =
        categoryString + `[${shopData[i].id}] ${shopData[i].name}\n`;
    }

    await channel.send(categoryString);
    const isNumFilter = (m) => !isNaN(m.content);
    let collectedMessage = await channel.awaitMessages(isNumFilter, { max: 1 });
    await collectedMessage.first().delete({ timeout: 10000 });

    let collectedMessageContent = collectedMessage.first().content;
    const category = shopData.find(
      (element) => element.id == collectedMessageContent
    );
    await channel.send(
      `You selected [${category.name}]. Which item would you like?`
    );

    let itemString = "";
    for (i = 0; i < category.items.length; i++) {
      itemString =
        itemString +
        `[${i}] ${category.items[i].name} | Price: $${category.items[i].price}\n`;
    }

    await channel.send(itemString);
    collectedMessage = await channel.awaitMessages(isNumFilter, { max: 1 });
    await collectedMessage.first().delete({ timeout: 10000 });
    collectedMessageContent = collectedMessage.first().content;

    const response = await db.query(
      `SELECT discount FROM discounts WHERE author='${
        collectedMessage.first().author.id
      }'`
    );
    if (response.rows.length > 0) {
      const discount = response.rows[0].discount;
      const total =
        ((100 - discount) / 100) *
        category.items[collectedMessageContent].price;
      await channel.send(
        `You selected [${category.items[collectedMessageContent].name}]`
      );
      await channel.send(`We have applied your discount: ${discount}%!`);
      await channel.send(
        `To purchase with paypal click this link: https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=ashton0312%40gmail%2ecom&lc=US&item_name=Sloppy%20Ark&amount=${total}%2e00&currency_code=USD&button_subtype=services&bn=PP%2dBuyNowBF%3abtn_buynowCC_LG%2egif%3aNonHosted`
      );
      await channel.send(
        `You can also purchase by sending $${total} via Venmo or Cash App`
      );
    } else {
      await channel.send(
        `You selected [${category.items[collectedMessageContent].name}]`
      );
      await channel.send(
        `To purchase with paypal click this link: https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=ashton0312%40gmail%2ecom&lc=US&item_name=Sloppy%20Ark&amount=${category.items[collectedMessageContent].price}%2e00&currency_code=USD&button_subtype=services&bn=PP%2dBuyNowBF%3abtn_buynowCC_LG%2egif%3aNonHosted`
      );
    }
  } catch (error) {
    console.error(error);
  }
};

const handleSpin = async (msg) => {
  try {
    const response = await db.query(
      `SELECT author FROM discounts WHERE author='${msg.author.id}'`
    );
    if (response.rows.length > 0) {
      await msg.reply("Hey! You already spun the wheel!");
    } else {
      const randomInt = getRandomInt();
      await msg.reply(
        `Congrats! You won ${randomInt}% off in the store! Your winnings have been saved and you can start an order by going to #shop and clicking the reaction!`
      );
      await db.query(
        `INSERT INTO discounts VALUES (${msg.author.id}, ${randomInt})`
      );
    }
  } catch (error) {
    console.error(error);
  }
};

const handleSetIndex = async (msg) => {
  try {
    await msg.delete();
    const index = msg.content.split(" ")[1];
    if (index < lootboxes.length) {
      lootBoxIndex = index;
      await msg.reply(`Set index of lootboxs to ${lootBoxIndex}!`);
    } else {
      await msg.reply(`Error. Max index is ${lootboxes.length - 1}`);
    }
  } catch (error) {
    console.error(error);
  }
};

const handleLoot = async (msg) => {
  try {
    await msg.delete();
    await msg.channel.send(
      `**[Loot Box]** \n${lootboxes[lootBoxIndex].latitude} Latitude\n${lootboxes[lootBoxIndex].longitude} Longitude\n*Hurry and find it before someone else does!*`
    );
    lootBoxIndex++;
  } catch (error) {
    console.error(error);
  }
};

const handleSetupShop = async (msg) => {
  try {
    const message = await msg.channel.send("Click The Heart To Donate!");
    await message.react("💚");
  } catch (error) {
    console.error(error);
  }
};

const handlePing = async (msg, client) => {
  try {
    let botMessage = await msg.channel.send(`Pinging...`);
    const messageEmbed = {
      color: 0x4be617,
      title: "Pong!",
      fields: [
        {
          name: "Server Ping",
          value: `${botMessage.createdAt - msg.createdAt}ms`,
        },
        {
          name: "API",
          value: `${client.ws.ping}ms`,
        },
      ],
      timestamp: new Date(),
      footer: {
        text: `API Status: ${client.ws.status}`,
        icon_url: client.user.avatarURL(),
      },
    };
    botMessage.delete();
    await msg.channel.send({ embed: messageEmbed });
  } catch (error) {
    console.error(error);
  }
};

const handleSetSuggestChannel = async (msg) => {
  try {
    await msg.delete();
    await db.query(
      `INSERT INTO suggest_channels VALUES (${msg.guild.id}, ${msg.channel.id})`
    );
    const reply = await msg.reply("Set this channel as a suggestion channel");
    await sleep(3000);
    await reply.delete();
  } catch (error) {
    console.error(error);
  }
};

const handleNewSuggestion = async (msg, client) => {
  try {
    await msg.delete();
    let suggestion = msg.content.substring(8); // 8 is the index at which the suggestion starts
    if (suggestion.length > 300) {
      return msg.reply("Sorry but suggestions can not exceed 300 characters");
    }
    // This will work but for production applications id's should be generated differently
    let suggestionID;
    let unique = false;
    do {
      suggestionID =
        Math.random().toString(36).substring(2, 8) +
        Math.random().toString(36).substring(2, 5);
      const query =
        "SELECT EXISTS(SELECT 1 from suggestions where suggestion_id=$1)";
      let values = [`${suggestionID}`];
      let result = await db.query(query, values);
      if (!result.rows[0].exists) {
        unique = true;
      }
    } while (!unique);

    const guildID = msg.guild.id;
    const response = await db.query(
      `SELECT channel_id FROM suggest_channels WHERE guild_id='${guildID}'`
    );
    const channelID = response.rows[0].channel_id;
    const suggestionsChannel = await client.channels.fetch(channelID);

    const messageEmbed = {
      color: 0x3e84ed,
      title: 'Suggestion',
      fields: [
        {
          name: 'Author',
          value: `${msg.author.tag}`,
        },
        {
          name: 'Suggestion',
          value: `${suggestion}`,
        },
      ],
      timestamp: new Date(),
      footer: {
        text: `User ID: ${msg.author.id} | sID: ${suggestionID}`,
      },
    };
    const suggestionMessage = await suggestionsChannel.send({
      embed: messageEmbed,
    });
    await suggestionMessage.react("✅");
    await suggestionMessage.react("🚫");

    const query = "INSERT INTO suggestions VALUES ($1, $2, $3, $4)";
    const values = [suggestionID, suggestion, suggestionsChannel.id, suggestionMessage.id];
    await db.query(query, values);
    
  } catch (error) {
    console.error(error);
  }
};

const handleUpdateSuggestion = async (msg, client, status) => {
  const suggestionID = msg.content.split(/ +/);
  const query = "SELECT * FROM suggestions WHERE suggestion_id='$1'";
  const values = [suggestionID];
  const response = await db.query(query, values);

  const suggestionChannel = await client.channels.fetch(response.rows[0].s_channel_id);

  suggestionMessage = await suggestionChannel.messages.fetch(response.rows[0].s_message_id);

  let embedColor = "";
  if (status === 0) {
    embedColor = "0x02e311";
  } else {
    embedColor = "0xed2626";
  }
  const messageEmbed = {
    color: embedColor,
    title: "Suggestion Approved"
  };

  await suggestionMessage.edit({ embed: messageEmbed });
  // Still need to figure out how to send a DM to a user
}

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

exports.handleReaction = handleReaction;
exports.handleSpin = handleSpin;
exports.handleSetIndex = handleSetIndex;
exports.handleLoot = handleLoot;
exports.handleSetupShop = handleSetupShop;
exports.handlePing = handlePing;
exports.handleSetSuggestChannel = handleSetSuggestChannel;
exports.handleNewSuggestion = handleNewSuggestion;
exports.handleUpdateSuggestion = handleUpdateSuggestion;
