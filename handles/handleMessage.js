const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const PREFIX = '-';
const commands = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    commandFiles.forEach(file => {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.name && command.execute) {
                commands.set(command.name.toLowerCase(), command);
            }
        } catch (err) {
            console.error(`Erreur lors du chargement de la commande ${file}:`, err);
        }
    });
}

async function handleMessage(senderId, message, pageAccessToken) {
    if (!message.text?.startsWith(PREFIX)) return;

    const args = message.text.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commands.has(commandName)) {
        return await sendMessage(
            senderId,
            { text: `Commande inconnue. Utilisez ${PREFIX}help pour la liste.` },
            pageAccessToken
        );
    }

    try {
        await commands.get(commandName).execute(senderId, args, pageAccessToken);
    } catch (error) {
        console.error(`Erreur avec la commande ${commandName}:`, error);
        await sendMessage(
            senderId,
            { text: error.message || 'Erreur lors de l\'exécution de la commande.' },
            pageAccessToken
        );
    }
}

loadCommands();

module.exports = { handleMessage };
