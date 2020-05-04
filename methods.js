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
      title: 'Ping!',
      description: 'Current Status',
      fields: [
        {
          name: 'Server Ping',
          value: `${botMessage.createdAt - msg.createdAt}ms`
        },
        {
          name: 'API',
          value: `${client.ws.ping}ms`
        }
      ],
      timestamp: new Date(),
      footer: {
        text: `Current Servers: ${client.guilds.size}`,
        icon_url: msg.author.displayAvatarURL
      }
    }
    botMessage.delete();
    await msg.channel.send({ embed: messageEmbed});
  } catch (error) {
    console.error(error);
  }
}

exports.handleReaction = handleReaction;
exports.handleSpin = handleSpin;
exports.handleSetIndex = handleSetIndex;
exports.handleLoot = handleLoot;
exports.handleSetupShop = handleSetupShop;
exports.handlePing = handlePing;
