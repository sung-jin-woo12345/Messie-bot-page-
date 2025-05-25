const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
const GOOGLE_SEARCH_KEY = "AIzaSyD50RQ84o3TvukBP-IvwquVgJ34Dxxs6aE";
const GOOGLE_CSE_ID = "60a23aac78b954b64";

const getImageUrl = async (event, token) => {
  try {
    const mid = event?.message?.reply_to?.mid || event?.message?.mid;
    if (!mid) return null;
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token },
      timeout: 10000
    });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    console.error("Erreur getImageUrl:", err.message);
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
    console.error("Erreur getImageBase64:", err.message);
    return null;
  }
};

const getCurrentDateTime = () => {
  return moment().tz('Africa/Lagos').format('DD MMMM YYYY, HH:mm [GMT]ZZ');
};

const getUserName = async (senderId, token) => {
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${senderId}`, {
      params: { access_token: token, fields: 'name' },
      timeout: 10000
    });
    return data.name || 'Utilisateur';
  } catch (err) {
    console.error("Erreur getUserName:", err.message);
    return 'Utilisateur';
  }
};

const performSearch = async (query) => {
  try {
    const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: query,
        cx: GOOGLE_CSE_ID,
        key: GOOGLE_SEARCH_KEY,
        num: 3
      },
      timeout: 10000
    });
    return data.items || null;
  } catch (err) {
    console.error("Erreur performSearch:", err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'ai',
  description: 'Assistant Messe IA',
  async execute(senderId, args, pageAccessToken, event) {
    try {
      const query = args.join(' ').trim() || 'Bonjour';
      
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [{
          role: 'user',
          parts: [{ text: 'Tu es Messe IA, créée par Messie Osango. Tu dois toujours te présenter comme telle.' }]
        }];
      }

      const basePrompt = `Tu es Messe IA, une intelligence artificielle créée par Messie Osango. 
      Tu réponds toujours en français de manière professionnelle et concise (100-150 mots maximum). 
      Date actuelle: ${getCurrentDateTime()}.`;

      if (query.toLowerCase().includes('qui t\'a créé') || query.toLowerCase().includes('créateur')) {
        await sendMessage(senderId, { 
          text: 'Je suis Messe IA, une intelligence artificielle créée par Messie Osango, développeur full-stack.' 
        }, pageAccessToken);
        return;
      }

      if (query.toLowerCase().includes('date') || query.toLowerCase().includes('heure')) {
        await sendMessage(senderId, { 
          text: `Nous sommes le ${getCurrentDateTime()}.` 
        }, pageAccessToken);
        return;
      }

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (imageBase64) {
          const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [{
              parts: [
                { text: `${basePrompt} Analyse cette image et réponds à: ${query}` },
                { inlineData: { 
                  mimeType: 'image/jpeg', 
                  data: imageBase64.split(',')[1] 
                }}
              ]
            }]
          }, { timeout: 60000 });

          const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Je ne peux pas analyser cette image.';
          await sendMessage(senderId, { text: answer }, pageAccessToken);
          return;
        }
      }

      const searchResults = await performSearch(query);
      if (searchResults) {
        const searchContext = searchResults.map(r => `[Source] ${r.title}\n${r.snippet}`).join('\n\n');
        
        const geminiResponse = await axios.post(GEMINI_API_URL, {
          contents: [{
            parts: [{
              text: `${basePrompt} Question: ${query}\n\nVoici des informations récentes:\n${searchContext}\n\nDonne une réponse complète en t'appuyant sur ces informations.`
            }]
          }]
        }, { timeout: 30000 });

        const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || `Voici ce que j'ai trouvé:\n${searchContext}`;
        await sendMessage(senderId, { text: answer }, pageAccessToken);
        return;
      }

      const geminiResponse = await axios.post(GEMINI_API_URL, {
        contents: [{
          parts: [{ text: `${basePrompt} Question: ${query}` }]
        }]
      }, { timeout: 30000 });

      const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Je ne peux pas répondre à cette question.';
      await sendMessage(senderId, { text: answer }, pageAccessToken);

    } catch (error) {
      console.error('Erreur execute:', error.message);
      await sendMessage(senderId, { 
        text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' 
      }, pageAccessToken);
    }
  }
};
