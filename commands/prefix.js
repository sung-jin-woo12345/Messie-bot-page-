const { PREFIX } = require('../handles/handleMessage');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'prefix',
  description: 'Affiche le préfixe actuel du bot',
  usage: 'prefix',
  author: 'Messie Osango',
  execute(senderId, args, pageAccessToken) {
    const prefixMessage = `
╭─⌾⋅ ミ✘.𝙼𝙴𝚂𝚂𝙸𝙴 ⋅⌾──╮
│
│   𝗣𝗿𝗲́𝗳𝗶𝘅𝗲 𝗮𝗰𝘁𝘂𝗲𝗹 𝗱𝘂 𝗯𝗼𝘁 :
│
│   ✧ 「 € 」
│
│   𝚄𝚝𝚒𝚕𝚒𝚜𝚎𝚣 €help 𝚙𝚘𝚞𝚛
│   𝚟𝚘𝚒𝚛 𝚝𝚘𝚞𝚜 𝚕𝚎𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎𝚜
│
│   
│
╰─────⌾⋅  ⋅⌾─────╯`;

    sendMessage(senderId, { text: prefixMessage }, pageAccessToken);
  }
};
