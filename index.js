require("dotenv").config()
const jsonfile = require('jsonfile')
const shopData = require("./categories.json")
const lootboxes = require("./lootboxes.json")
const Discord = require("discord.js")
const client = new Discord.Client()

let donationCount = 1;
let lootBoxIndex = 0;

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
  if(msg.content === "!loot" && msg.member.hasPermission('ADMINISTRATOR')) {
    msg.delete();
    msg.channel.send(`**[Loot Box]** \n${lootboxes[lootBoxIndex].latitude} Latitude\n${lootboxes[lootBoxIndex].longitude} Longitude\n*Hurry and find it before someone else does!*`)
    .then(() => {
      lootBoxIndex++;
    })
    .catch(console.error);
  }
  if(msg.content.startsWith("!setIndex") && msg.member.hasPermission('ADMINISTRATOR')) {
    msg.delete();
    let index = msg.content.split(' ')[1];
    lootBoxIndex = index;
    msg.reply(`Set index of lootboxs to ${lootBoxIndex}!`)
    .catch(console.error);
  }
  if(msg.content === "!spin") {
    randomInt = getRandomInt();
    msg.reply(`Congrats! You won ${randomInt}% off in the store! Your winnings have been saved and you can start an order by going to #shop and clicking the reaction!`)
    .catch(console.error);
    let obj = {name: msg.author.id, discount: randomInt}
    jsonfile.writeFile('discounts.json', obj, { flag: 'a' })
    .then(console.log('Wrote to file!'))
    .catch(console.error);
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
            let discount;
            jsonfile.readFileSync('discounts.json').then((obj) => {
              discount = obj.find(ele => ele.name == collected.first().author.id).discount
            })
            if(discount > 0) {
              Promise.all([
                channel.send(`You selected [${response.items[item].name}]`),
                channel.send(`We have applied your discount of ${discount}%!`),
                channel.send(`To purchase with paypal click this link: https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=ashton0312%40gmail%2ecom&lc=US&item_name=Sloppy%20Ark&amount=${(100-discount)/100 * (response.items[item].price)}%2e00&currency_code=USD&button_subtype=services&bn=PP%2dBuyNowBF%3abtn_buynowCC_LG%2egif%3aNonHosted`)
              ]).catch(console.error);
            } else {
              Promise.all([
                channel.send(`You selected [${response.items[item].name}]`),
                channel.send(`To purchase with paypal click this link: https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=ashton0312%40gmail%2ecom&lc=US&item_name=Sloppy%20Ark&amount=${response.items[item].price}%2e00&currency_code=USD&button_subtype=services&bn=PP%2dBuyNowBF%3abtn_buynowCC_LG%2egif%3aNonHosted`)
              ]).catch(console.error);
            }
          }).catch(console.log);
        }).catch(console.log);
      }).catch(console.log);
    }).catch(console.log);
  }).catch(console.error);
}

const getRandomInt = () => {
  min = Math.ceil(10);
  max = Math.floor(50);

  return Math.floor(Math.random() * (max - min)) + min;
}