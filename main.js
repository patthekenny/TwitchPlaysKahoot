const tmi = require('tmi.js');

const prefix = "!";

let commandFunctions = {};

// It is IMPERATIVE that all commands are in this array.
let commands = ["test", "addquiz"];
// An array of quiz ID's, NOT URLS(form them when using).
let quizQueue = [];
let isInQuiz = false;
// Use to verify quiz URLs.
const quizParser = new DOMParser();

let options = {
    options: {
        debug: true
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: "livekahoot",
        password: "oauth:" + process.env.TWITCH_SECRET
    },
    channels: ["#livekahoot"]
};



let client = new tmi.client(options);
client.connect().then( (data) => {
    sendMessage("MrDestructoid Twitch Plays Kahoot initiated.");
});

// So annoyed at putting the channel in the function, that I'll just make a wrapper.
function sendMessage(message)
{
    client.say('livekahoot', message);
}

function processCommands(userstate, message) {
    if(!message.startsWith(prefix)) return;

    // This includes the first part of the message.
    let messageArgs = message.split(" ");

    if(commands.includes(messageArgs[0].replace("!", "")))
    {
        commandFunctions[messageArgs[0].replace("!", "")](userstate, messageArgs);
    }
}

commandFunctions.test = function test(userstate, messageArgs)
{
    sendMessage("Blocked and reported.");
}

commandFunctions.quiz = function quiz(userstate, messageArgs)
{
    if(messageArgs.length > 2)
    {
        console.log(userstate);
        sendMessage(userstate["display-name"] + ", you've attempted to use a malformed command. Type !help {command} for assistance.");
    }
}

client.on("message", (channel, userstate, message, self) => {
    if(self) return;

    switch(userstate["message-type"]) {
        case "chat":
            processCommands(userstate, message);
            break;
    }
});
