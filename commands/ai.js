const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'ai',
  description: 'Interact with AI using text queries',
  usage: 'ask a question',
  author: 'Messie Osango',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim() || 'Hello';
    const systemPrompt = "Vous parlez avec une IA développée par Messie Osango. ";

    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }

      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const payload = {
        contents: [{
          parts: [{
            text: systemPrompt + prompt
          }]
        }]
      };

      const { data } = await axios.post(API_URL, payload);

      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

      conversationHistory[senderId].push({ role: 'assistant', content: responseText });

      const chunkSize = 1900;
      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.substring(i, i + chunkSize);
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
      await sendMessage(senderId, { text: "Une erreur s'est produite." }, pageAccessToken);
    }
  },
};
