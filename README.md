# Custom Discord Bot

This is a Discord bot I wrote for my own Discord Community. I have added different functions to it as needed.

## Current Commands and Features

 - !setupShop - Used to create a message in the current channel with a reaction users can click to access the donation function of the bot.
 - !spin - Generates a random number between 10 and 50, saves a "discount" record in the database, and reply's to the user with a message.
 - !loot - Broadcasts the message with coordinates from the lootboxes.json file.
 - !setIndex {index} - Utility command used to set the exact index used to pick a loot box.

 Note: All of these commands require the user to have the ADMINISTATOR permission in the Discord except !spin.

## JSON file examples

An example categories.json
```javascript
[{
    "id": 1,
    "name" : "Example Category 1",
    "items": [
        {
            "name": "First Item Name",
            "price": 3
        },
        {
            "name": "Second Item Name",
            "price": 5
        }
    ]
},
{
    "id": 2,
    "name" : "Example Category 2",
    "items": [
        {
            "name": "First Item Name",
            "price": 2
        },
        {
            "name": "Second Item Name",
            "price": 6
        }
    ]
}]
```

An example lootboxes.json
```javascript
[{
    "latitude": 24.1,
    "longitude": 32.4
},
{
    "latitude": 16.0,
    "longitude": 79.7
},
{
    "latitude": 29.1,
    "longitude": 31.5
}]
```