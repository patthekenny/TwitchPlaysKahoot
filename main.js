const tmi = require('tmi.js');
const Kahoot = require('kahoot.js');
let kahoot = new Kahoot;

const prefix = "!";

let commandFunctions = {};

// It is IMPERATIVE that all commands are in this array.
let commands = ["addquiz"];
// An array of quiz ID's, NOT URLS(form them when using).
let quizQueue = [];
let isInQuiz = false;

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

// Check if we need to join a quiz every five seconds, it's important that the amount of time
// is short so people don't get bored.
setInterval(function checkJoinQuiz() {
    if(isInQuiz) return;

    // Here, we can assume we're not in a quiz. Begin joining one.
    if(quizQueue[0])
    {
        joinQuiz(quizQueue[0]);
    }

}, 5000);

function joinQuiz(quizID)
{
    let kahootView = document.createElement('webview');
    kahootView.id = "kahoot_page";
    kahootView.src = `https://play.kahoot.it/#/lobby?quizId=${quizID}`;
    kahootView.style.cssText = "display: inline-flex; width: 100%; height: 100%;";
    document.getElementById("mainquiz").appendChild(kahootView);

    kahootView.addEventListener("dom-ready", () => {
        // So many timeouts... I need to contact kahoot about how long their bloat takes to load.
        setTimeout(() => { 
            kahootView.executeJavaScript("document.documentElement.innerHTML", (results) => {
                // I'm sorry for this...
                // INCREDIBLY HORRIFYING HACK, PLEASE FIND A WAY TO FIX!
                let joinID = results.split("<strong ng-bind-html=\"gamePin\" data-functional-selector=\"game-pin\" class=\"ng-binding\">")[1].split("</strong>")[0];
                console.log(`Joining Quiz! ID: ${joinID}`);
                kahoot.join(joinID, 'livekahoot');
                kahoot.on("joined", () => {
                    console.log(`kahoot ${joinID} successfully joined`);
                });
                kahoot.on("quizStart", quiz => {
                    sendMessage(`NOW PLAYING: ${quiz.name}`);
                });
                kahoot.on("questionStart", question => {
                    question.answer(0);
                }); 
                kahoot.on("quizEnd", () => {
                    manageQuizEnd();
                });
            });
        }, 2000);

        isInQuiz = true;

        sendMessage("30 SECONDS TO JOIN!");
        setTimeout(() => {        
            console.log("in the thingermajigger");
            let quizView = document.getElementById("kahoot_page");
            console.log(quizView.src);
            quizView.src = `https://play.kahoot.it/#/start?quizId=${quizID}`;
            console.log(quizView.src);
            quizView.reload();
        }, 5000);
    
        setTimeout(() => {
            sendMessage("10 SECONDS TO JOIN!");
        }, 20000);

        setTimeout(() => {
            sendMessage("5 SECONDS TO JOIN!");
        }, 25000);
        
    }); 

}

function manageQuizEnd()
{
    sendMessage("The current quiz is over! Starting a new one in 30 seconds...");
    setTimeout(() => {
        isInQuiz = false;
    });
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

// Checks if the quiz is a valid Kahoot quiz or not, and if it is, add it to the queue.
commandFunctions.addquiz = function addquiz(userstate, messageArgs)
{
    // If there's more than two different args, the first arg being the command,
    // then the command was input wrong. 
    if(messageArgs.length > 2)
    {
        console.log(userstate);
        sendMessage(userstate["display-name"] + ", you've attempted to use a malformed command. Type !help {command} for assistance.");
	    return;
    }


    let webViewElement = document.createElement('webview');
    webViewElement.src = `https://play.kahoot.it/#/intro?quizId=${messageArgs[1]}`;
    document.getElementById("tempquizes").appendChild(webViewElement);

    webViewElement.addEventListener('dom-ready', () => {
        console.log('ready');
        setTimeout(() => {
            webViewElement.executeJavaScript("document.documentElement.innerHTML", (results) => {
                // If the page doesn't have an error message after 5 seconds, it's 
                // vaid, and add it to the queue.
                if(!results.includes("There was a problem connecting to the game. Please try again."))
                {
                    quizQueue.push(messageArgs[1]);
                    sendMessage(`${userstate["display-name"]}, your quiz has been added to the queue! (position ${quizQueue.length})`);
                }
                else
                {
                    sendMessage(`${userstate["display-name"]}, that quiz URL is invalid.`);
                }

                webViewElement.remove();
            });
        }, 7000);
    }); 

}

client.on("message", (channel, userstate, message, self) => {
    if(self) return;

    switch(userstate["message-type"]) {
        case "chat":
            processCommands(userstate, message);
            break;
    }
});
