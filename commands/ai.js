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
  if (event.message?.attachments) {
    for (const attachment of event.message.attachments) {
      if (attachment.type === 'image') {
        return attachment.payload.url;
      }
    }
  }
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v19.0/${mid}/attachments`, {
      params: { access_token: token },
      timeout: 10000
    });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000
    });
    return `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
  } catch (err) {
    return null;
  }
};

const getCurrentDateTime = () => {
  return moment().tz('Africa/Lagos').format('DD MMMM YYYY, HH:mm [GMT]Z');
};

const getUserName = async (senderId, token) => {
  try {
    const { data } = await axios.get(`https://graph.facebook.com/${senderId}`, {
      params: { access_token: token, fields: 'name' },
      timeout: 10000
    });
    return data.name || 'Utilisateur';
  } catch (err) {
    return 'Utilisateur';
  }
};

const conversationHistory = {};

const buildPrompt = (userName, history, query, isImage = false) => {
  const identity = `
  [IDENTITÉ]
  - Tu es Messie IA
  - Conçu par Messie Osango
  - Style: Professionnel mais amical
  - Langue: Français
  `;

  const directives = `
  [DIRECTIVES]
  1. Répondre en français avec police stylisée
  2. Ne mentionner Messie Osango que si questionné sur ta création
  3. Pour les images: Décrire précisément le contenu
  4. Réponses concises et précises
  5. Pas d'encadrement des réponses
  6. Pour les salutations: Réponses courtes
  7. Maintenir le contexte de la conversation
  `;

  const historyContext = history.length > 0 ? 
    `[HISTORIQUE]\n${history.slice(-3).map(msg => `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}`).join('\n')}` : 
    '[NOUVELLE CONVERSATION]';

  if (isImage) {
    return `${identity}\n${directives}\n${historyContext}\n\nANALYSE CETTE IMAGE ET RÉPONDS À: "${query}"`;
  }

  return `${identity}\n${directives}\n${historyContext}\n\nUTILISATEUR: "${query}"\nMESSIE IA:`;
};

module.exports = {
  name: 'ai',
  description: 'Assistant intelligent Messie IA',
  usage: 'Posez une question ou envoyez une image',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    const query = args.join(' ').trim() || 'Bonjour';
    const GEMINI_API_KEY = 'AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }

    try {
      const userName = await getUserName(senderId, pageAccessToken);
      const imageUrl = await getImageUrl(event, pageAccessToken);

      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (imageBase64) {
          const prompt = buildPrompt(userName, conversationHistory[senderId], query, true);
          
          const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
              contents: [{
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
                ]
              }]
            },
            { timeout: 60000 }
          );

          const responseText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je ne peux pas analyser cette image.';
          
          conversationHistory[senderId].push({ role: 'user', content: `[IMAGE] ${query}` });
          conversationHistory[senderId].push({ role: 'assistant', content: responseText });
          
          await sendMessage(senderId, { text: formatResponse(responseText) }, pageAccessToken);
          return;
        }
      }

      const prompt = buildPrompt(userName, conversationHistory[senderId], query);
      
      const response = await axios.post(
        'https://uchiha-perdu-ia-five.vercel.app/api',
        { prompt },
        { timeout: 30000 }
      );

      const responseText = response.data?.response || 'Désolé, je ne peux pas répondre pour le moment.';
      
      conversationHistory[senderId].push({ role: 'user', content: query });
      conversationHistory[senderId].push({ role: 'assistant', content: responseText });

      await sendMessage(senderId, { text: formatResponse(responseText) }, pageAccessToken);

    } catch (error) {
      await sendMessage(senderId, { text: formatResponse('Une erreur est survenue.') }, pageAccessToken);
    }
  }
};
