const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'help',
  description: 'Afficher les commandes disponibles',
  usage: 'help\nhelp [command name]',
  author: 'messie osango',
  execute(senderId, args, pageAccessToken) {
    const commandsDir = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const commandFile = commandFiles.find(file => {
        const command = require(path.join(commandsDir, file));
        return command.name.toLowerCase() === commandName;
      });

      if (commandFile) {
        const command = require(path.join(commandsDir, commandFile));
        const commandDetails = `╭⌾⋅ ミ✘.𝙼𝙴𝚂𝚂𝙸𝙴〈 ⋅⌾╮
│
│   𝙽𝚊𝚖𝚎: ${command.name}
│   𝙳𝚎𝚜𝚌: ${command.description}
│   𝚄𝚜𝚊𝚐𝚎: ${command.usage}
│
│   ┐('～\`;)┌
│
╰─────⌾⋅ ⌾ ⋅⌾─────╯`;
        
        sendMessage(senderId, { text: commandDetails }, pageAccessToken);
      } else {
        sendMessage(senderId, { text: `Command "${commandName}" not found.` }, pageAccessToken);
      }
      return;
    }

    const commands = commandFiles.map(file => {
      const command = require(path.join(commandsDir, file));
      return `│   ✧ ${command.name}`;
    });

    const helpMessage = `╭⌾⋅ ミ✘.𝙼𝙴𝚂𝚂𝙸𝙴〈 ⋅⌾╮
│
${commands.join('\n')}
│
│   𝚃𝚢𝚙𝚎: -help [𝚌𝚖𝚍]
│   𝚏𝚘𝚛 𝚍𝚎𝚝𝚊𝚒𝚕𝚜
│
│   ┐('～\`;)┌
│
╰─────⌾⋅ ⌾ ⋅⌾─────╯`;

    sendMessage(senderId, { text: helpMessage }, pageAccessToken);
  }
};
