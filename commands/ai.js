const axios = require('axios');
const moment = require('moment-timezone');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
const GOOGLE_SEARCH_KEY = "AIzaSyD50RQ84o3TvukBP-IvwquVgJ34Dxxs6aE";
const GOOGLE_CSE_ID = "60a23aac78b954b64";

const getImageUrl = async (event, token) => {
  try {
    if (!event.message || (!event.message.attachments && !event.message.reply_to)) {
      return null;
    }

    const mid = event.message.reply_to?.mid || event.message.mid;
    if (!mid) return null;

    const { data } = await axios.get(`https://graph.facebook.com/v19.0/${mid}`, {
      params: {
        access_token: token,
        fields: 'attachments{image_data,file_url}'
      },
      timeout: 10000
    });

    return data.attachments?.data?.[0]?.image_data?.url || 
           data.attachments?.data?.[0]?.file_url || null;

  } catch (err) {
    console.error("Erreur getImageUrl:", err.response?.data || err.message);
    return null;
  }
};

const getImageBase64 = async (imageUrl) => {
  try {
    const { data } = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024
    });
    return `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`;
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
    const { data } = await axios.get(`https://graph.facebook.com/v19.0/${senderId}`, {
      params: {
        access_token: token,
        fields: 'first_name,last_name'
      },
      timeout: 10000
    });
    return `${data.first_name} ${data.last_name}` || 'Utilisateur';
  } catch (err) {
    console.error("Erreur getUserName:", err.response?.data || err.message);
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
        num: 3,
        safe: 'active'
      },
      timeout: 10000
    });
    return data.items?.slice(0, 3) || null;
  } catch (err) {
    console.error("Erreur performSearch:", err.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'ai',
  description: 'Assistant Messe IA',
  async execute(senderId, args, pageAccessToken, event) {
    if (!pageAccessToken) {
      console.error('Erreur: pageAccessToken manquant');
      return;
    }

    try {
      const query = args.join(' ').trim() || 'Bonjour';
      
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [{
          role: 'model',
          parts: [{ text: 'Je suis Messe IA, créée par Messie Osango. Comment puis-je vous aider ?' }]
        }];
      }

      const basePrompt = `Tu es Messe IA, une IA créée par Messie Osango. 
      Date: ${getCurrentDateTime()}. Utilisateur: ${await getUserName(senderId, pageAccessToken)}.
      Sois concis (100-150 mots max) et professionnel.`;

      if (/qui (t['’]a créé|t['’]as fait)|créateur|parent/i.test(query)) {
        await sendMessage(senderId, { 
          text: 'Je suis Messe IA, une intelligence artificielle développée par Messie Osango.' 
        }, pageAccessToken);
        return;
      }

      if (/date|heure|temps|année|mois|jour/i.test(query)) {
        await sendMessage(senderId, { 
          text: `Nous sommes le ${getCurrentDateTime()}.` 
        }, pageAccessToken);
        return;
      }

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (imageBase64) {
          const { data } = await axios.post(GEMINI_API_URL, {
            contents: [{
              parts: [
                { text: `${basePrompt}\nAnalyse cette image et réponds à: ${query}` },
                { inlineData: { 
                  mimeType: 'image/jpeg', 
                  data: imageBase64.split(',')[1] 
                }}
              ]
            }]
          }, { timeout: 60000 });

          const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je ne peux pas analyser cette image.';
          await sendMessage(senderId, { text: answer }, pageAccessToken);
          return;
        }
      }

      const searchResults = await performSearch(query);
      if (searchResults) {
        const searchContext = searchResults.map((r,i) => `[Résultat ${i+1}]\nTitre: ${r.title}\nContenu: ${r.snippet}`).join('\n\n');
        
        const { data } = await axios.post(GEMINI_API_URL, {
          contents: [{
            parts: [{
              text: `${basePrompt}\nQuestion: ${query}\n\nInformations:\n${searchContext}\n\nRéponds en français en t'appuyant sur ces informations.`
            }]
          }]
        }, { timeout: 30000 });

        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || `Voici ce que j'ai trouvé:\n${searchContext}`;
        await sendMessage(senderId, { text: answer }, pageAccessToken);
        return;
      }

      const { data } = await axios.post(GEMINI_API_URL, {
        contents: [{
          parts: [{ text: `${basePrompt}\nQuestion: ${query}` }]
        }]
      }, { timeout: 30000 });

      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je ne peux pas répondre à cette question.';
      await sendMessage(senderId, { text: answer }, pageAccessToken);

    } catch (error) {
      console.error('Erreur execute:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      await sendMessage(senderId, { 
        text: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.' 
      }, pageAccessToken);
    }
  }
};
