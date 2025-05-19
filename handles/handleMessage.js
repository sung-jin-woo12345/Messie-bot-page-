const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const commands = new Map();
const PREFIX = '€';

fs.readdirSync(path.join(__dirname, '../commands'))
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    try {
      const command = require(`../commands/${file}`);
      commands.set(command.name.toLowerCase(), command);
    } catch (error) {
      console.error(`Error loading command ${file}:`, error);
    }
  });

async function handleMessage(event, pageAccessToken) {
  if (!event?.sender?.id || !event?.message?.text) return;

  const senderId = event.sender.id;
  const messageText = event.message.text.trim();

  if (messageText.toLowerCase() === 'prefix') {
    return commands.get('prefix').execute(senderId, [], pageAccessToken);
  }

  if (messageText.startsWith(PREFIX)) {
    const [cmd, ...args] = messageText.slice(PREFIX.length).trim().split(/\s+/);
    const command = commands.get(cmd.toLowerCase());

    if (command) {
      try {
        await command.execute(senderId, args, pageAccessToken);
      } catch (error) {
        console.error('Execution error:', error);
        await sendMessage(senderId, { 
          text: `❌ Error: ${error.message || 'Command failed'}` 
        }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, {
        text: `⚠️ Unknown command. Use ${PREFIX}help for help.`
      }, pageAccessToken);
    }
  }
}

module.exports = { handleMessage, PREFIX };
