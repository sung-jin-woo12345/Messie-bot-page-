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
  try {
    const mid = event?.message?.reply_to?.mid || event?.message?.mid;
    if (!mid) return null;
    
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token },
      timeout: 10000
    });
    
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (error) {
    console.error('Erreur getImageUrl:', error.message);
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024
    });
    
    return `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
  } catch (error) {
    console.error('Erreur getImageBase64:', error.message);
    return null;
  }
};

module.exports = {
  name: 'ai',
  description: 'Assistant intelligent',
  usage: 'Posez votre question ou envoyez une image',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    try {
      const query = args.join(' ').trim() || 'Bonjour';
      const API_URL = 'https://messie-api-ia.vercel.app/chat';
      const API_KEY = 'messie12356osango2025jinWoo';

      if (!pageAccessToken || !senderId) {
        await sendMessage(senderId, { text: formatResponse('Configuration invalide') }, pageAccessToken);
        return;
      }

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: formatResponse('Image invalide ou trop lourde') }, pageAccessToken);
          return;
        }

        const response = await axios.post(
          `${API_URL}?prompt=${encodeURIComponent(query)}&image=true`,
          { image: imageBase64.split(',')[1] },
          { headers: { 'Authorization': API_KEY }, timeout: 60000 }
        );

        const answer = response.data?.response || 'Je ne peux pas analyser cette image.';
        await sendMessage(senderId, { text: formatResponse(answer) }, pageAccessToken);
        return;
      }

      const response = await axios.get(
        `${API_URL}?prompt=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': API_KEY }, timeout: 30000 }
      );

      const answer = response.data?.response || 'Je ne peux pas répondre maintenant.';
      const formattedAnswer = formatResponse(answer);
      
      for (let i = 0; i < formattedAnswer.length; i += 1900) {
        await sendMessage(senderId, { 
          text: formattedAnswer.substring(i, i + 1900) 
        }, pageAccessToken);
      }

    } catch (error) {
      console.error('Erreur execute:', error.response?.data || error.message);
      let errorMessage = 'Erreur système';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Temps de réponse dépassé';
      } else if (error.response?.status === 401) {
        errorMessage = 'Erreur d\'authentification';
      }
      
      await sendMessage(senderId, { 
        text: formatResponse(errorMessage) 
      }, pageAccessToken);
    }
  }
};
