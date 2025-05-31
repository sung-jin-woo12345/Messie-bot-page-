const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event) => {
  try {
    if (!event || !event.message || !event.message.attachments || !event.message.attachments[0]) return null;
    const attachment = event.message.attachments[0];
    if (attachment.type !== 'image' || !attachment.payload || !attachment.payload.url) return null;
    return attachment.payload.url;
  } catch (err) {
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const headResponse = await axios.head(imageUrl, { timeout: 5000 });
    const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
    if (contentLength > 15 * 1024 * 1024) return null;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return { base64, mimeType: 'image/jpeg' };
  } catch (err) {
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
    return 'Utilisateur anonyme';
  }
};

const normalToBold = {
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
};

const normalToItalic = {
  'A': '𝑨', 'B': '𝑩', 'C': '𝑪', 'D': '𝑫', 'E': '𝑬', 'F': '𝑭', 'G': '𝑮', 'H': '𝑯', 'I': '𝑰', 'J': '𝑱', 'K': '𝑲', 'L': '𝑳', 'M': '𝑴', 'N': '𝑵', 'O': '𝑶', 'P': '𝑷', 'Q': '𝑸', 'R': '𝑹', 'S': '𝑺', 'T': '𝑻', 'U': '𝑼', 'V': '𝑽', 'W': '𝑾', 'X': '𝑿', 'Y': '𝒀', 'Z': '𝒁',
  'a': '𝒂', 'b': '𝒃', 'c': '𝒄', 'd': '𝒅', 'e': '𝒆', 'f': '𝒇', 'g': '𝒈', 'h': '𝒉', 'i': '𝒊', 'j': '𝒋', 'k': '𝒌', 'l': '𝒍', 'm': '𝒎', 'n': '𝒏', 'o': '𝒐', 'p': '𝒑', 'q': '𝒒', 'r': '𝒓', 's': '𝒔', 't': '𝒕', 'u': '𝒖', 'v': '𝒗', 'w': '𝒘', 'x': '𝒙', 'y': '𝒚', 'z': '𝒛'
};

const normalToStrike = {
  'A': '𝘼', 'B': '𝘽', 'C': '𝘾', 'D': '𝘿', 'E': '𝙀', 'F': '𝙁', 'G': '𝙂', 'H': '𝙃', 'I': '𝙄', 'J': '𝙅',
  'K': '𝙆', 'L': '𝙇', 'M': '𝙈', 'N': '𝙉', 'O': '𝙊', 'P': '𝙋', 'Q': '𝙌', 'R': '𝙍', 'S': '𝙎', 'T': '𝙏',
  'U': '𝙐', 'V': '𝙑', 'W': '𝙒', 'X': '𝙓', 'Y': '𝙔', 'Z': '𝙕',
  'a': '𝙖', 'b': '𝙗', 'c': '𝙘', 'd': '𝙙', 'e': '𝙚', 'f': '𝙛', 'g': '𝙜', 'h': '𝙝', 'i': '𝙞', 'j': '𝙟',
  'k': '𝙠', 'l': '𝙡', 'm': '𝙢', 'n': '𝙣', 'o': '𝙤', 'p': '𝙥', 'q': '𝙦', 'r': '𝙧', 's': '𝙨', 't': '𝙩',
  'u': '𝙪', 'v': '𝙫', 'w': '𝙬', 'x': '𝙭', 'y': '𝙮', 'z': '𝙯'
};

const normalToLink = {
  'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸', 'J': '𝙹',
  'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃',
  'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
  'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': '𝚒', 'j': '𝚓',
  'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝',
  'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣'
};

const applyMarkdown = (text) => {
  let transformed = text;
  transformed = transformed.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1.split('').map(char => normalToBold[char] || char).join(''));
  transformed = transformed.replace(/\*(.*?)(?:\s|$)/g, (match, p1) => p1.split('').map(char => normalToItalic[char] || char).join('') + ' ');
  transformed = transformed.replace(/_(.*?)_/g, (match, p1) => p1.split('').map(char => normalToItalic[char] || char).join(''));
  transformed = transformed.replace(/~~(.*?)~~/g, (match, p1) => p1.split('').map(char => normalToStrike[char] || char).join(''));
  transformed = transformed.replace(/\[(.*?)\]/g, (match, p1) => p1.split('').map(char => normalToLink[char] || char).join(''));
  transformed = transformed.replace(/^>\s(.*)$/gm, (match, p1) => `➤ ${p1.split('').map(char => normalToBold[char] || char).join('')}`);
  return transformed;
};

const estimateTokens = (text) => {
  return Math.ceil(text.length / 4);
};

const conversationHistory = {};
const userData = {};
const persistentNames = {};

const extractName = (query, senderId) => {
  const namePatterns = [/je m['’]appelle\s+([A-Za-zÀ-ÿ\s]+)/i, /je me nomme\s+([A-Za-zÀ-ÿ\s]+)/i];
  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      persistentNames[senderId] = name;
      return name;
    }
  }
  return null;
};

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
        await sendMessage(senderId, { text: 'Erreur : token d’accès manquant. Contacte Messie Osango.' }, process.env.PAGE_ACCESS_TOKEN || pageAccessToken);
        return;
      }
      if (!senderId) {
        await sendMessage(senderId, { text: 'Erreur : ID utilisateur manquant.' }, pageAccessToken);
        return;
      }
      if (!GEMINI_API_KEY) {
        await sendMessage(senderId, { text: 'Erreur : clé API Gemini manquante. Contacte Messie Osango.' }, pageAccessToken);
        return;
      }
      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      if (!userData[senderId]) userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };
      if (!persistentNames[senderId]) {
        const extractedName = extractName(query, senderId);
        if (extractedName) userData[senderId].name = extractedName;
      }
      const historyString = conversationHistory[senderId].map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const historyTokens = estimateTokens(historyString);
      if (historyTokens > 10000) conversationHistory[senderId] = [];
      const dateTime = getCurrentDateTime();
      const userName = persistentNames[senderId] || userData[senderId].name;
      const conversationHistoryString = conversationHistory[senderId].map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      conversationHistory[senderId].push({ role: 'user', content: query });
      const prompt = `Tu es Messe IA, créée par Messie Osango. Date: ${dateTime}. Nom: ${userName}. Utilise l’historique: ${conversationHistoryString} pour répondre de manière fluide. Réponds en français, professionnel mais amical. Analyse: "${query}".

1. Si salutation ou vague (ex. "salut"), réponds gentiment et demande le comment il va.

2. Si question claire avec données internes (pré-2025), réponds précisément. Pour l’heure, utilise fuseaux (Japon JST, France CEST).
3. Si données post-2025 ou inconnues, renvoie "Recherche en cours ${query}".
4.tu dois dialoguer comme un être humain gentiment et fournir des réponses professionnelles
Pas de recherche web initiale.`;
      const llamaResponse = await axios.post(
        'https://uchiha-perdu-ia-five.vercel.app/api',
        { prompt },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      let answer = llamaResponse.data.response || 'Erreur : pas de réponse.';
      if (answer.startsWith('Recherche en cours')) {
        const searchResponse = await axios.post(
          'https://uchiha-perdu-search-api.vercel.app/search',
          { query },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        answer = searchResponse.data.response || 'Aucun résultat.';
      }
      answer = applyMarkdown(answer);
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
      const imageUrl = await getImageUrl(event);
      if (imageUrl) {
        const imageData = await getImageBase64(imageUrl);
        if (!imageData) {
          await sendMessage(senderId, { text: 'Erreur : image invalide (max 15 Mo). Réessaie.' }, pageAccessToken);
          return;
        }
        const geminiPrompt = `Tu es Messe IA. Analyse cette image et réponds à: "${query}".`;
        const geminiPayload = {
          contents: [{
            parts: [
              { text: geminiPrompt },
              { inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } }
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
              await sendMessage(senderId, { text: 'Erreur : analyse image échouée. Réessaie.' }, pageAccessToken);
              return;
            }
          }
        }
        const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erreur image.';
        conversationHistory[senderId].push({ role: 'user', content: query });
        conversationHistory[senderId].push({ role: 'assistant', content: answer });
        const formattedAnswer = applyMarkdown(answer);
        const messageChunks = chunkMessage(formattedAnswer, 1900);
        for (const chunk of messageChunks) {
          await sendMessage(senderId, { text: chunk }, pageAccessToken);
        }
      }
    } catch (err) {
      await sendMessage(senderId, { text: 'Erreur serveur. Contacte Messie Osango.' }, pageAccessToken);
    }
  },
};
