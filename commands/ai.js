const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, { params: { access_token: token } });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    console.error("Erreur récupération URL image:", err?.response?.data || err.message);
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error("Erreur conversion image base64:", err.message);
    return null;
  }
};

const getCurrentDateTime = (timezone = 'Africa/Lagos') => {
  const dt = moment().tz(timezone);
  return `${dt.format('DD MMMM YYYY, HH:mm')} ${dt.zoneAbbr()}`;
};

const getUserName = async (senderId, pageAccessToken) => {
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${senderId}`, {
      params: { access_token: pageAccessToken, fields: 'name' }
    });
    return data.name || 'Utilisateur';
  } catch (err) {
    console.error("Erreur récupération nom user:", err?.response?.data || err.message);
    return 'Utilisateur';
  }
};

const conversationHistory = {};
const userData = {};

module.exports = {
  name: 'ai',
  description: 'Interagir avec Messe IA via des questions textuelles ou images.',
  usage: 'Pose une question ou réponds à une image avec une question.',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Hello';
    const GEMINI_API_KEY = 'AIzaSyDVOtXtSag-ggdYL62eo4pLZjSwpJ9npcY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }
      if (!userData[senderId]) {
        userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };
      }
      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: 'Erreur : impossible de lire l’image.' }, pageAccessToken);
          return;
        }
        const geminiPrompt = `Tu es Messe IA, créée par Messie Osango. Analyse l'image et réponds à la question suivante en français : "${query}". Fournis une réponse concise et professionnelle (50-100 mots max).`;
        const geminiPayload = {
          contents: [{
            parts: [
              { text: geminiPrompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
            ]
          }]
        };
        const geminiResponse = await axios.post(
          GEMINI_API_URL,
          geminiPayload,
          { headers: { 'Content-Type': 'application/json' }, params: { key: GEMINI_API_KEY }, timeout: 30000 }
        );
        const answer = geminiResponse.data.candidates[0].content.parts[0].text.trim() || 'Erreur : pas de réponse pour l’image.';
        conversationHistory[senderId].push({ role: 'user', content: query });
        conversationHistory[senderId].push({ role: 'assistant', content: answer });
        const chunkMessage = (message, maxLength) => {
          const chunks = [];
          for (let i = 0; i < message.length; i += maxLength) {
            chunks.push(message.slice(i, i + maxLength));
          }
          return chunks;
        };
        const messageChunks = chunkMessage(answer, 1900);
        for (const chunk of messageChunks) {
          await sendMessage(senderId, { text: chunk }, pageAccessToken);
        }
        return;
      }
      const dateTime = getCurrentDateTime();
      const userName = userData[senderId].name;
      let conversationHistoryString = conversationHistory[senderId].map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      if (conversationHistoryString.length > 40000) {
        conversationHistory[senderId] = [];
        conversationHistoryString = '';
      }
      conversationHistory[senderId].push({ role: 'user', content: query });
      const prompt = `Tu es Messe IA, une IA créée par Messie Osango, conçue pour répondre avec précision en te basant uniquement sur tes connaissances internes, sans aucune recherche web. Voici la date et l’heure ${dateTime}. Voici le nom de l’user : ${userName}. Pour les questions sur l’heure dans d’autres pays, utilise les fuseaux horaires appropriés (ex. : Japon = JST, UTC+9; France = CEST, UTC+2). Voici l’historique de la conversation : ${conversationHistoryString}. Analyse l’input suivant : "${query}".

1. Si l’input est une salutation, un message vague, ou non pertinent (ex. : "salut", "yo", "ça va", phrases courtes sans question claire), réponds sans faire de recherches.".
2. Si l’input est une question claire et que tu peux répondre précisément avec tes connaissances internes, fournis une réponse concise, professionnelle et directe (50-100 mots max) en français, en tenant compte de l’historique pour rester cohérent. Pour les questions sur l’heure, donne la réponse exacte basée sur le fuseau horaire demandé.
3. Si l’input est une question mais que tu n’as pas l’information, que tu n’es pas sûr, ou que la question nécessite des données récentes (ex. : actualités, sorties d’anime, événements après 2023), renvoie exactement : "Recherche en cours ${query}" sans aucune autre réponse.

Ne fais jamais de recherche web. Réponds toujours en français. Respecte strictement ces instructions et utilise "Recherche en cours" uniquement pour les cas spécifiés.`;
      const llamaResponse = await axios.post(
        'https://uchiha-perdu-ia-five.vercel.app/api',
        { prompt },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      let answer = llamaResponse.data.response || 'Erreur : pas de réponse de Llama.';
      if (answer.startsWith('Recherche en cours')) {
        console.log(answer);
        const searchResponse = await axios.post(
          'https://uchiha-perdu-search-api.vercel.app/search',
          { query },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        answer = searchResponse.data.response || 'Erreur : pas de réponse de recherche.';
      }
      conversationHistory[senderId].push({ role: 'assistant', content: answer });
      const chunkMessage = (message, maxLength) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += maxLength) {
          chunks.push(message.slice(i, i + maxLength));
        }
        return chunks;
      };
      const messageChunks = chunkMessage(answer, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }
    } catch (err) {
      console.error('Erreur:', err.message, err.response?.data);
      await sendMessage(senderId, { text: 'Oups, erreur serveur ! Réessaie ou contacte Messie Osango. 😅' }, pageAccessToken);
    }
  },
};
