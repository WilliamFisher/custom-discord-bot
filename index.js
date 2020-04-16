require("dotenv").config()
const shopData = require("./categories.json")
const Discord = require("discord.js")
const client = new Discord.Client()

let donationCount = 1;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})
client.on("message", msg => {
  if(msg.content === "!setupShop") {
    const filter = (reaction, user) => {
      return reaction.emoji.name === '💚';
    };
    msg.channel.send('Click The Heart To Donate!')
    .then(message => {
      message.react('💚');
    })
  }
})

client.on('messageReactionAdd', (reaction, user) => {
  if(reaction.emoji.name === '💚' && reaction.message.author.id == client.user.id) {
    handleReaction(reaction, user);
  }
})
client.login(process.env.BOT_TOKEN)


const handleReaction = (reaction, user) => {
  if(reaction.message.author.id === user.id) return;
  var reactUser = user;
  reaction.users.remove(user.id);
  reaction.message.guild.channels.create(`donation-${donationCount}`, {
    type: 'text',
    permissionOverwrites: [
      {
        id: user.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
      },
      {
        id: reaction.message.guild.roles.everyone,
        deny: ['VIEW_CHANNEL'],
      },
      {
        id: client.user.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
      },
    ],
  })
  .then((channel) => {
    donationCount++;
    channel.send('Hi! Start by typing the category number you would like to purchase from!', { reply: reactUser })
    .then(() => {
      let categoryString = "";
      for(i=0; i < shopData.length; i++) {
        categoryString = categoryString + `[${shopData[i].id}] ${shopData[i].name}\n`;
      }
      channel.send(categoryString)
      .catch(console.error);
      const filter = m => !isNaN(m.content);
      channel.awaitMessages(filter, { max: 1 })
      .then((collected) => {
        collected.first().delete().catch(console.error);
        let input = collected.first().content;
        let channel = collected.first().channel;
        let response = shopData.find(element => element.id == input)
        channel.send(`You selected [${response.name}]. Which item would you like?`)
        let itemString = "";
        for(i = 0; i < response.items.length; i++) {
          itemString = itemString + `[${input}${i}] ${response.items[i].name} | Price: $${response.items[i].price}\n`
        }
        channel.send(itemString)
        .then((message) => {
          const filter = m => !isNaN(m.content);
          message.channel.awaitMessages(filter, { max: 1 })
          .then((collected) => {
            collected.first().delete().catch(console.error);
            let category = collected.first().content.substring(0,1);
            let item = collected.first().content.substring(1);
            let channel = collected.first().channel;
            let response = shopData.find(element => element.id == category)
            Promise.all([
              channel.send(`You selected [${response.items[item].name}]`),
              channel.send(`To purchase send $${response.items[item].price} using one of our accepted payment methods.`)
            ]).catch(console.log);
          }).catch(console.log);
        }).catch(console.log);
      }).catch(console.log);
    }).catch(console.log);
  }).catch(console.error);
}