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

const performGoogleSearch = async (query) => {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: query,
        cx: '60a23aac78b954b64',
        key: 'AIzaSyD50RQ84o3TvukBP-IvwquVgJ34Dxxs6aE',
        num: 3
      },
      timeout: 10000
    });
    return response.data?.items || null;
  } catch (err) {
    console.error("Erreur recherche Google:", err.message);
    return null;
  }
};

const conversationHistory = {};
const userData = {};

module.exports = {
  name: 'ai',
  description: 'Interagir avec Messe IA',
  usage: 'Pose une question ou réponds à une image avec une question',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Hello';
    const GEMINI_API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    try {
      if (!pageAccessToken) {
        await sendMessage(senderId, { text: 'Erreur : token manquant. Contacte Messie Osango.' }, process.env.PAGE_ACCESS_TOKEN || pageAccessToken);
        return;
      }

      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      if (!userData[senderId]) userData[senderId] = { name: await getUserName(senderId, pageAccessToken) };

      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('qui t\'a créé') || lowerQuery.includes('créateur')) {
        await sendMessage(senderId, { text: "J'ai été créé par Messie Osango." }, pageAccessToken);
        return;
      }

      if (lowerQuery.includes('date') || lowerQuery.includes('heure')) {
        await sendMessage(senderId, { text: `Nous sommes le ${getCurrentDateTime()}.` }, pageAccessToken);
        return;
      }

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: 'Erreur : image trop lourde (max 15 Mo).' }, pageAccessToken);
          return;
        }

        const geminiResponse = await axios.post(
          GEMINI_API_URL,
          {
            contents: [{
              parts: [
                { text: `Analyse cette image et réponds à : "${query}" (100 mots max, français)` },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
              ]
            }]
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );

        const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Pas de réponse';
        await sendMessage(senderId, { text: answer }, pageAccessToken);
        return;
      }

      const searchResults = await performGoogleSearch(query);
      if (searchResults) {
        const searchContext = searchResults.map(item => 
          `• ${item.title}\n${item.snippet}\n${item.link}`
        ).join('\n\n');

        const reformulationResponse = await axios.post(
          GEMINI_API_URL,
          {
            contents: [{
              parts: [{
                text: `Reformule ces résultats pour "${query}" (150 mots max, français) :\n\n${searchContext}`
              }]
            }]
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );

        const answer = reformulationResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || searchContext;
        await sendMessage(senderId, { text: answer }, pageAccessToken);
        return;
      }

      const response = await axios.post(
        GEMINI_API_URL,
        {
          contents: [{
            parts: [{
              text: `Réponds à "${query}" (100 mots max, français)`
            }]
          }]
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      const answer = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Pas de réponse';
      await sendMessage(senderId, { text: answer }, pageAccessToken);

    } catch (err) {
      console.error('Erreur:', err.message);
      await sendMessage(senderId, { text: 'Oups, erreur serveur ! Réessaie.' }, pageAccessToken);
    }
  },
};
