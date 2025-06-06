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
    return data.name || 'Utilisateur';
  } catch (err) {
    return 'Utilisateur anonyme';
  }
};

const conversationHistory = {};
const userData = {};

module.exports = {
  name: 'ai',
  description: 'mon bot page',
  usage: 'Posez votre question ou envoyez une image',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Bonjour';
    const API_URL = 'https://messie-api-ia.vercel.app/chat?prompt=';
    const API_KEY = 'messie12356osango2025jinWoo';

    try {
      if (!pageAccessToken || !senderId) {
        await sendMessage(senderId, { text: formatResponse('Erreur de configuration') }, pageAccessToken);
        return;
      }

      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      if (!userData[senderId]) userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };

      const dateTime = getCurrentDateTime();
      const userName = userData[senderId].name;

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: formatResponse('Erreur : image trop lourde') }, pageAccessToken);
          return;
        }

        const response = await axios.get(`${API_URL}${encodeURIComponent(query)}&image=true`, {
          headers: { 'Authorization': API_KEY },
          data: { image: imageBase64.split(',')[1] },
          timeout: 60000
        });

        const answer = response.data?.response || 'Je ne peux pas analyser cette image.';
        conversationHistory[senderId].push({ role: 'user', content: `[IMAGE] ${query}` });
        conversationHistory[senderId].push({ role: 'assistant', content: answer });

        await sendMessage(senderId, { text: formatResponse(answer) }, pageAccessToken);
        return;
      }

      conversationHistory[senderId].push({ role: 'user', content: query });

      const response = await axios.get(`${API_URL}${encodeURIComponent(query)}`, {
        headers: { 'Authorization': API_KEY },
        timeout: 30000
      });

      let answer = response.data?.response || 'Je ne peux pas répondre maintenant.';
      conversationHistory[senderId].push({ role: 'assistant', content: answer });
      
      const chunks = [];
      const formattedAnswer = formatResponse(answer);
      for (let i = 0; i < formattedAnswer.length; i += 1900) {
        chunks.push(formattedAnswer.substring(i, i + 1900));
      }
      
      for (const chunk of chunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      await sendMessage(senderId, { 
        text: formatResponse('Erreur système') 
      }, pageAccessToken);
    }
  },
};
