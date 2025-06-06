const axios = require('axios');
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

module.exports = {
  name: 'ai',
  description: 'Assistant intelligent',
  usage: 'Posez votre question',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    try {
      const query = args.join(' ').trim() || 'Bonjour';
      const API_URL = 'https://messie-api-ia.vercel.app/chat';
      const API_KEY = process.env.API_KEY || 'messie12356osango2025jinWoo';

      if (!pageAccessToken) {
        throw new Error('Token de page manquant');
      }

      const response = await axios.post(API_URL, {
        prompt: query
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const answer = response.data?.response || 'Pas de réponse';
      await sendMessage(senderId, { text: formatResponse(answer) }, pageAccessToken);

    } catch (error) {
      let errorMessage = 'Erreur système';
      if (error.response?.status === 401) {
        errorMessage = 'Erreur d\'authentification API';
      }
      await sendMessage(senderId, { text: formatResponse(errorMessage) }, pageAccessToken);
    }
  }
};
