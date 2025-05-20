const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

module.exports = {
  name: 'conversation',
  description: 'IA conversationnelle sans mot-clé requis',
  usage: '[Écrivez normalement]',
  author: 'Messie Osango',
  isChatbot: true, 

  async execute(senderId, messageText, pageAccessToken) {
    const prompt = messageText.trim();
    
    
    if (!prompt || prompt.length < 2) return;

    try {
      const response = await axios.post(API_URL, {
        contents: [{
          role: "user",
          parts: [{
            text: `[Contexte: Tu es une IA créée par Messie Osango. Réponds naturellement en français.]
            ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000
        }
      });
      
      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text 
        || "Désolé, je n'ai pas pu répondre. veuillez contacter messie osango afin de le lui informer .";
      
      sendMessage(senderId, { text: aiResponse }, pageAccessToken);
    } catch (error) {
      console.error('Erreur lors de la requête :', error);
      sendMessage(senderId, { text: '⚠️ Problème technique - Réessayez plus tard' }, pageAccessToken);
    }
  }
};
