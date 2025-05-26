const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token },
      timeout: 10000 
    });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    console.error("Erreur récupération URL image:", err?.response?.data || err.message); 
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const headResponse = await axios.head(imageUrl, { timeout: 5000 });
    const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
    if (contentLength > 15 * 1024 * 1024) return null; 
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 }); 
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
      params: { access_token: pageAccessToken, fields: 'name' },
      timeout: 10000 
    });
    return data.name || 'Utilisateur anonyme';
  } catch (err) {
    console.error("Erreur récupération nom user:", err?.response?.data || err.message); 
    return 'Utilisateur anonyme';
  }
};

const conversationHistory = {};
const userData = {};

module.exports = {
  name: 'ai',
  description: 'Interagir avec Messe IA via des questions textuelles ou des images',
  usage: 'Pose une question ou réponds à une image avec une question.',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Hello';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDVOtXtSag-ggdYL62eo4pLZjSwpJ9npcY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    try {
      if (!pageAccessToken) {
        await sendMessage(senderId, { text: 'Erreur : token d\'accès manquant.' }, process.env.PAGE_ACCESS_TOKEN || pageAccessToken);
        return;
      }
      if (!senderId) {
        await sendMessage(senderId, { text: 'Erreur : ID utilisateur manquant.' }, pageAccessToken);
        return;
      }
      if (!GEMINI_API_KEY) {
        await sendMessage(senderId, { text: 'Erreur : clé API manquante.' }, pageAccessToken);
        return;
      }
      
      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      if (!userData[senderId]) userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: 'Erreur : impossible de lire l\'image.' }, pageAccessToken);
          return;
        }
        
        const geminiPayload = {
          contents: [{
            parts: [
              { text: query },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
            ]
          }]
        };
        
        let geminiResponse;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            geminiResponse = await axios.post(
              GEMINI_API_URL,
              geminiPayload,
              { headers: { 'Content-Type': 'application/json' }, params: { key: GEMINI_API_KEY }, timeout: 60000 }
            );
            break;
          } catch (err) {
            if (attempt === 1) {
              await sendMessage(senderId, { text: 'Erreur : impossible d\'analyser l\'image.' }, pageAccessToken);
              return;
            }
          }
        }
        
        const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Pas de réponse';
        conversationHistory[senderId].push({ role: 'user', content: query });
        conversationHistory[senderId].push({ role: 'assistant', content: answer });
        
        const chunkMessage = (message, maxLength) => {
          const chunks = [];
          for (let i = 0; i < message.length; i += maxLength) chunks.push(message.slice(i, i + maxLength));
          return chunks;
        };
        
        const messageChunks = chunkMessage(answer, 1900);
        for (const chunk of messageChunks) {
          await sendMessage(senderId, { text: chunk }, pageAccessToken);
        }
        return;
      }

      const answer = 'Réponse standard';
      conversationHistory[senderId].push({ role: 'user', content: query });
      conversationHistory[senderId].push({ role: 'assistant', content: answer });
      
      const chunkMessage = (message, maxLength) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += maxLength) chunks.push(message.slice(i, i + maxLength));
        return chunks;
      };
      
      const messageChunks = chunkMessage(answer, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }
    } catch (err) {
      console.error('Erreur:', err.message, err.response?.data); 
      await sendMessage(senderId, { text: 'Erreur serveur.' }, pageAccessToken);
    }
  },
};
