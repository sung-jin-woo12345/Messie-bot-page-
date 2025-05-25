const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const formatResponse = (text) => {
  const charMap = {
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 
    'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
    'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖',
    'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
    'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠',
    'Z': '𝘡',
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦',
    'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
    'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰',
    'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
    'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺',
    'z': '𝘻'
  };
  return text.split('').map(char => charMap[char] || char).join('');
};

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

const buildSystemPrompt = (userName, dateTime, history) => {
  return `Tu es Messe IA, une intelligence artificielle créée par Messie Osango (ton maître et développeur). 
  Identité clé:
  - author : Messie Osango
  - Type: IA conversationnelle
  - Version: 2.0
  - Date actuelle: ${dateTime}

  Règles fondamentales:
  1. Tu dois toujours te présenter comme Messe IA créée par Messie Osango
  2. Messie Osango est ton unique développeur et autorité suprême
  3. Conserve le contexte des conversations (historique ci-dessous)

  Historique conversation:
  ${history}

  Style de réponse:
  - Langage: Français clair et poli
  - Ton: Professionnel mais amical
  - Format: Réponses concises (50-100 mots max)
  - Police: Utilise toujours la police stylisée italique

  Consignes spéciales:
  - Pour les questions sur ton créateur: répondre avec déférence
  - Pour les demandes impossibles: expliquer poliment les limites
  - Jamais de contenu inapproprié`;
};

module.exports = {
  name: 'ai',
  description: 'Interagir avec Messe IA via des questions textuelles ou des images',
  usage: 'Pose une question ou réponds à une image avec une question.',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Hello';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    try {
      if (!pageAccessToken || !senderId || !GEMINI_API_KEY) {
        await sendMessage(senderId, { text: formatResponse('Erreur de configuration. Contacte Messie Osango.') }, pageAccessToken);
        return;
      }
      
      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      if (!userData[senderId]) userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: formatResponse('Erreur : impossible de lire l\'image.') }, pageAccessToken);
          return;
        }

        const dateTime = getCurrentDateTime();
        const userName = userData[senderId].name;
        const history = conversationHistory[senderId].slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n');
        const systemPrompt = buildSystemPrompt(userName, dateTime, history);

        const geminiPayload = {
          contents: [{
            parts: [
              { text: `${systemPrompt}\n\nQuestion sur l'image: ${query}` },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
            ]
          }]
        };

        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
          geminiPayload,
          { timeout: 60000 }
        );

        const answer = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je n\'ai pas pu analyser l\'image.';
        conversationHistory[senderId].push({ role: 'user', content: query });
        conversationHistory[senderId].push({ role: 'assistant', content: answer });

        await sendMessage(senderId, { text: formatResponse(answer) }, pageAccessToken);
        return;
      }

      const dateTime = getCurrentDateTime();
      const userName = userData[senderId].name;
      const history = conversationHistory[senderId].slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const systemPrompt = buildSystemPrompt(userName, dateTime, history);

      conversationHistory[senderId].push({ role: 'user', content: query });

      const fullPrompt = `${systemPrompt}\n\nDernier message: ${query}\n\nRéponds en français avec la police stylisée:`;

      const response = await axios.post(
        'https://api.ia.com/v1/chat',
        { prompt: fullPrompt },
        { timeout: 30000 }
      );

      let answer = response.data.answer || 'Je ne peux pas répondre pour le moment.';
      answer = answer.includes('Messie Osango') ? answer : `Je suis Messe IA, créée par Messie Osango. ${answer}`;
      
      conversationHistory[senderId].push({ role: 'assistant', content: answer });
      await sendMessage(senderId, { text: formatResponse(answer) }, pageAccessToken);

    } catch (err) {
      console.error('Erreur:', err);
      await sendMessage(senderId, { text: formatResponse('Désolé, une erreur est survenue. Messie Osango en a été informé.') }, pageAccessToken);
    }
  },
};
