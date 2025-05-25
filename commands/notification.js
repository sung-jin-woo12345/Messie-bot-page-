const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

const usersFilePath = path.join(__dirname, 'users.json');

const loadUsers = () => {
  if (fs.existsSync(usersFilePath)) {
    const data = fs.readFileSync(usersFilePath);
    return new Set(JSON.parse(data));
  }
  return new Set();
};

const saveUsers = (users) => {
  fs.mkdirSync(path.dirname(usersFilePath), { recursive: true });
  fs.writeFileSync(usersFilePath, JSON.stringify([...users], null, 2));
};

let activeUsers = loadUsers();

module.exports = {
  name: 'notification',
  description: 'Envoie une notification à tous les utilisateurs.',
  usage: 'notification [message]',
  author: 'Messie Osango',
  authorizedUid: 'uid_not_found_404',
  execute: async (senderId, args, pageAccessToken, event) => {
    if (senderId !== this.authorizedUid) {
      await sendMessage(senderId, { text: `𝙰𝚑 𝚍'𝚊𝚌𝚌𝚘𝚛𝚍 ! 𝚃𝚞 𝚟𝚎𝚞𝚡 𝚞𝚝𝚒𝚕𝚒𝚜𝚎𝚛 𝚌𝚎𝚝𝚝𝚎 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎 ? 𝚁𝚎𝚟𝚒𝚎𝚗𝚜 𝚕'𝚞𝚝𝚒𝚕𝚒𝚜𝚎𝚛 𝚚𝚞𝚊𝚗𝚍 𝚝𝚞 𝚜𝚎𝚛𝚊𝚜 𝚙𝚊𝚛𝚝𝚊𝚗𝚝 𝚙𝚘𝚞𝚛 𝚕𝚊  𝚖𝚊𝚒𝚝𝚛𝚒𝚜𝚎 𝚍𝚞 𝚌𝚘𝚍𝚎. 𝙴𝚗𝚏𝚕𝚞𝚛𝚎.` }, pageAccessToken);
      return;
    }
    if (!args.length) {
      await sendMessage(senderId, { text: 'Entre le message à envoyer aux users.' }, pageAccessToken);
      return;
    }
    const message = args.join(' ').trim();
    const notificationText = `

╭⌾⋅𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 ⋅╮
│
╭💬-𝗠𝗘𝗦𝗦𝗔𝗚𝗘: 
╰┈➤ ${message}
│   
  ┐('～\`;)┌
╰───⌾⋅    ⋅⌾───╯
   『 𝕄𝕖𝕤𝕤𝕚𝕖 𝕆𝕤𝕒𝕟𝕘𝕠 』
`;
    if (activeUsers.size === 0) {
      await sendMessage(senderId, { text: 'Aucun utilisateur trouvé pour l’instant. Interagis d’abord avec le bot !' }, pageAccessToken);
      return;
    }
    for (const userId of activeUsers) {
      await sendMessage(userId, { text: notificationText }, pageAccessToken).catch(err => {
        console.error(`Erreur envoi à ${userId}:`, err.message);
      });
    }
    await sendMessage(senderId, { text: `Notification envoyée à ${activeUsers.size} utilisateur(s) !` }, pageAccessToken);
    saveUsers(activeUsers);
  },
  addUser: (userId) => {
    activeUsers.add(userId);
    saveUsers(activeUsers);
  }
};
