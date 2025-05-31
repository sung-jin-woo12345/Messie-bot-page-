const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const usersFilePath = path.join(__dirname, 'users.json');
const authorizedUid = 'uid_not_found_or_not_work';

const loadUsers = () => {
  if (fs.existsSync(usersFilePath)) {
    try {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      return new Set(JSON.parse(data));
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err.message);
    }
  }
  return new Set();
};

const saveUsers = (users) => {
  try {
    fs.mkdirSync(path.dirname(usersFilePath), { recursive: true });
    fs.writeFileSync(usersFilePath, JSON.stringify([...users], null, 2));
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement des utilisateurs:', err.message);
  }
};

let activeUsers = loadUsers();

module.exports = {
  name: 'notification',
  description: 'Envoie une notification à tous les utilisateurs.',
  usage: 'notification <message>',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken) {
    if (senderId !== authorizedUid) {
      await sendMessage(senderId, { text: '𝙰𝚑 𝚍'𝚊𝚌𝚌𝚘𝚛𝚍 ! 𝚃𝚞 𝚟𝚎𝚞𝚡 𝚞𝚝𝚒𝚕𝚒𝚜𝚎𝚛 𝚌𝚎𝚝𝚝𝚎 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎 ? 𝚁𝚎𝚟𝚒𝚎𝚗𝚜 𝚕'𝚞𝚝𝚒𝚕𝚒𝚜𝚎𝚛 𝚚𝚞𝚊𝚗𝚍 𝚝𝚞 𝚜𝚎𝚛𝚊𝚜 𝚙𝚊𝚛𝚝𝚊𝚗𝚝 𝚙𝚘𝚞𝚛 𝚕𝚊  𝚖𝚊𝚒𝚝𝚛𝚒𝚜𝚎 𝚍𝚞 𝚌𝚘𝚍𝚎. 𝙴𝚗𝚏𝚕𝚞𝚛𝚎..' }, pageAccessToken);
      return;
    }
    if (args.length === 0) {
      await sendMessage(senderId, { text: '𝚂𝙿𝙴𝙲𝙸𝙵𝙸𝙴 𝚄𝙽 𝙼𝙴𝚂𝚂𝙰𝙶𝙴. 𝚄𝚂𝙰𝙶𝙴: 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 <𝚖𝚎𝚜𝚜𝚊𝚐𝚎>' }, pageAccessToken);
      return;
    }
    const message = args.join(' ').trim();
    const notificationText = `
𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡
━━━━━━━━━━━━━━
╭💬-𝗠𝗘𝗦𝗦𝗔𝗚𝗘: 
╰┈➤ ${message}
━━━━━━━━━━━━━━
   
`;
    let users = [...activeUsers];
    if (users.length === 0) {
      users = await getAllUsers(pageAccessToken);
      users.forEach(userId => activeUsers.add(userId));
      saveUsers(activeUsers);
    }
    if (users.length === 0) {
      await sendMessage(senderId, { text: '𝙰𝚄𝙲𝚄𝙽 𝚄𝚃𝙸𝙻𝙸𝚂𝙰𝚃𝙴𝚄𝚁 𝚃𝚁𝙾𝚄𝚅𝙴. 𝙽𝙾𝚃𝙸𝙵𝙸𝙲𝙰𝚃𝙸𝙾𝙽 𝙽𝙾𝙽 𝙴𝙽𝚅𝙾𝚈𝙴𝙴.' }, pageAccessToken);
      return;
    }
    const success = [];
    const failed = [];
    for (const userId of users) {
      try {
        await sendMessage(userId, { text: notificationText }, pageAccessToken);
        success.push(userId);
      } catch (err) {
        console.error(`Erreur envoi à ${userId}:`, err.message);
        failed.push(userId);
      }
    }
    const response = `Notification envoyée avec succès à ${success.length} utilisateurs. Échec pour ${failed.length} utilisateurs.`;
    await sendMessage(senderId, { text: response }, pageAccessToken);
  },
  addUser: (userId) => {
    activeUsers.add(userId);
    saveUsers(activeUsers);
  }
};

async function getAllUsers(pageAccessToken) {
  try {
    const response = await axios.get(`https://graph.facebook.com/v22.0/me/conversations`, {
      params: { access_token: pageAccessToken, fields: 'participants' },
      timeout: 10000
    });
    const conversations = response.data.data;
    const userIds = [];
    for (const convo of conversations) {
      for (const participant of convo.participants.data) {
        if (participant.id !== authorizedUid) {
          userIds.push(participant.id);
        }
      }
    }
    return [...new Set(userIds)];
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs via API:', err.message);
    return [];
  }
}
