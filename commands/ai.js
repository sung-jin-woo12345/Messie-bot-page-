const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const API_CONFIG = {
  BASE_URL: 'https://messie-api-ia.vercel.app/chat',
  API_KEY: 'messie12356osango2025jinWoo',
  TIMEOUT: 20000
};

const MAX_RETRIES = 2;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MESSAGE_CHUNK_SIZE = 1900;

const getImageUrl = async (event) => {
  try {
    const attachment = event?.message?.attachments?.[0];
    return attachment?.type === 'image' ? attachment.payload?.url : null;
  } catch {
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const head = await axios.head(imageUrl, { timeout: 5000 });
    const size = parseInt(head.headers['content-length']) || 0;
    if (size > MAX_IMAGE_SIZE) return null;
    
    const { data } = await axios.get(imageUrl, { 
      responseType: 'arraybuffer', 
      timeout: 15000 
    });
    return {
      base64: Buffer.from(data).toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch {
    return null;
  }
};

const getUserName = async (senderId, token) => {
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${senderId}`, {
      params: { access_token: token, fields: 'name' },
      timeout: 10000
    });
    return data.name || 'Utilisateur';
  } catch {
    return 'Utilisateur';
  }
};

const markdownMaps = {
  bold: Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').map(c => [c, `𝗕𝗼𝗹𝗱${c}`])),
  italic: Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').map(c => [c, `𝑖𝑡𝑎𝑙𝑖𝑐${c}`])),
  strike: Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').map(c => [c, `̶s̶t̶r̶i̶k̶e̶${c}`]))
};

const applyMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, (_, p1) => p1.split('').map(c => markdownMaps.bold[c] || c).join(''))
    .replace(/\*(.*?)\*/g, (_, p1) => p1.split('').map(c => markdownMaps.italic[c] || c).join(''))
    .replace(/~~(.*?)~~/g, (_, p1) => p1.split('').map(c => markdownMaps.strike[c] || c).join(''));
};

const conversationHistory = {};
const userNames = {};

async function callAPI(prompt, isImage = false, imageData = null) {
  const params = new URLSearchParams({ prompt });
  if (isImage) params.append('image', 'true');
  
  const config = {
    headers: { 'Authorization': API_CONFIG.API_KEY },
    params,
    timeout: API_CONFIG.TIMEOUT
  };

  if (isImage) {
    config.headers['Content-Type'] = 'application/json';
    config.data = { image: imageData };
  }

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const { data } = await axios.get(API_CONFIG.BASE_URL, config);
      return data?.response || "Je n'ai pas pu traiter votre demande";
    } catch (error) {
      if (i === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function sendChunkedMessages(senderId, text, token) {
  const chunks = [];
  for (let i = 0; i < text.length; i += MESSAGE_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + MESSAGE_CHUNK_SIZE));
  }
  
  for (const chunk of chunks) {
    await sendMessage(senderId, { text: chunk }, token);
  }
}

module.exports = {
  name: 'ai',
  description: 'Assistant intelligent Messe IA',
  usage: 'Posez votre question',
  author: 'Messie Osango',
  async execute(senderId, args, token, event) {
    try {
      const query = args.join(' ').trim() || 'Bonjour';
      
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
        userNames[senderId] = await getUserName(senderId, token);
      }

      conversationHistory[senderId].push({ role: 'user', content: query });
      if (conversationHistory[senderId].length > 20) {
        conversationHistory[senderId] = conversationHistory[senderId].slice(-10);
      }

      const response = await callAPI(query);
      const formattedResponse = applyMarkdown(response);
      
      conversationHistory[senderId].push({ role: 'assistant', content: response });
      await sendChunkedMessages(senderId, formattedResponse, token);

      const imageUrl = await getImageUrl(event);
      if (imageUrl) {
        const imageData = await getImageBase64(imageUrl);
        if (imageData) {
          const imageResponse = await callAPI(query, true, imageData.base64);
          const formattedImageResponse = applyMarkdown(imageResponse);
          await sendChunkedMessages(senderId, formattedImageResponse, token);
        }
      }
    } catch (error) {
      await sendMessage(senderId, { 
        text: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard.'
      }, token);
    }
  }
};
