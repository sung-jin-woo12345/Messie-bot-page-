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
      await sendMessage(senderId, { text: "Ah d'accord ! Tu veux utiliser cette commande ? Reviens l'utiliser quand tu seras partant pour la maitrise du code. Enflure.." }, pageAccessToken);
      return;
    }
    if (args.length === 0) {
      await sendMessage(senderId, { text: 'SPECIFIE UN MESSAGE. USAGE: notification <message>' }, pageAccessToken);
      return;
    }
    const message = args.join(' ').trim();
    const notificationText = `
NOTIFICATION
━━━━━━━━━━━━━━
╭💬-MESSAGE: 
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
      await sendMessage(senderId, { text: 'AUCUN UTILISATEUR TROUVE. NOTIFICATION NON ENVOYEE.' }, pageAccessToken);
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
