const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'help',
  description: 'Affiche la putain de liste des commandes',
  usage: 'help\nhelp [nom de la commande]',
  author: 'messie osango',

  execute(senderId, args, pageAccessToken) {
    const commandsDir = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    const loadCommand = file => {
      try {
        return require(path.join(commandsDir, file));
      } catch {
        return null;
      }
    };

    if (args.length) {
      const name = args[0].toLowerCase();
      const command = commandFiles.map(loadCommand).find(c => c?.name.toLowerCase() === name);

      return sendMessage(
        senderId,
        { text: command
          ? `
╔═━━━━━━━━═╗
  𝙼𝚎𝚜𝚜𝚒𝚎 page bot 
╠══════════╣
𝙉𝙊𝙈 : ${command.name}
𝘿𝙀𝙎𝘾𝙍𝙄𝙋 : ${command.description}
𝙐𝙎𝙎𝘼𝙂𝙀 : ${command.usage}
╚═━━━━━━━━═╝`
          : `Putain de commande "${name}" introuvable.` },
        pageAccessToken
      );
    }

    const commandsList = commandFiles
      .map(loadCommand)
      .filter(c => c && c.name !== 'test')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => `▸ ${c.name}`)
      .join('\n');

    sendMessage(
      senderId,
      { text: `
╔══════════╗
 𝘾𝙊𝙈𝙈𝘼𝙉𝘿𝙀𝙎  
╠══════════╣
${commandsList}
╠══════════╣
Tape €help [commande]
pour les détails bordel
╚══════════╝` },
      pageAccessToken
    );
  }
};
