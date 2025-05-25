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

const needsCurrentInfo = (question) => {
  const currentInfoKeywords = [
    'actualité', 'actualités', 'aujourd\'hui', 'maintenant', 'récent',
    'dernières nouvelles', 'ce mois', 'cette année', '2025', 'mort', 'décès',
    'élection', 'résultat', 'score', 'match', 'événement', 'conférence',
    'lancement', 'sortie', 'nouveau', 'nouvelle'
  ];
  return currentInfoKeywords.some(keyword => question.toLowerCase().includes(keyword));
};

const performGoogleSearch = async (query) => {
  try {
    const GOOGLE_SEARCH_API_KEY = "AIzaSyD50RQ84o3TvukBP-IvwquVgJ34Dxxs6aE";
    const GOOGLE_CSE_ID = "60a23aac78b954b64";
    
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_CSE_ID}&key=${GOOGLE_SEARCH_API_KEY}&num=3`;
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data.items && response.data.items.length > 0) {
      return response.data.items.slice(0, 3).map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link
      }));
    }
    return null;
  } catch (err) {
    console.error("Erreur recherche Google:", err.message);
    return null;
  }
};

const conversationHistory = {};
const userData = {};

module.exports = {
  name: 'ai',
  description: 'Interagir avec Messe IA via des questions textuelles ou des images',
  usage: 'Pose une question ou réponds à une image avec une question.',
  author: 'Messie Osango',
  async execute(senderId, args, pageAccessToken, event) {
    let query = args.join(' ').trim() || 'Hello';
    const GEMINI_API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
      if (!pageAccessToken) {
        await sendMessage(senderId, { text: 'Erreur : token d'accès manquant. Contacte Messie Osango.' }, process.env.PAGE_ACCESS_TOKEN || pageAccessToken);
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

      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('qui t\'a créé') || lowerQuery.includes('créateur') || 
          lowerQuery.includes('qui t\'as fait') || lowerQuery.includes('parent')) {
        await sendMessage(senderId, { text: "J'ai été créé par Messie Osango, un développeur talentueux." }, pageAccessToken);
        return;
      }

      if (lowerQuery.includes('date') || lowerQuery.includes('heure') || 
          lowerQuery.includes('temps') || lowerQuery.includes('année') || 
          lowerQuery.includes('mois') || lowerQuery.includes('minute') ||
          lowerQuery.includes('jour')) {
        await sendMessage(senderId, { text: `Nous sommes le ${getCurrentDateTime()}.` }, pageAccessToken);
        return;
      }

      const imageUrl = await getImageUrl(event, pageAccessToken);
      if (imageUrl) {
        const imageBase64 = await getImageBase64(imageUrl);
        if (!imageBase64) {
          await sendMessage(senderId, { text: 'Erreur : impossible de lire l'image (peut-être trop lourde, max 15 Mo). Réessaie.' }, pageAccessToken);
          return;
        }
        const geminiPrompt = `Tu es Messe IA, créée par Messie Osango. Analyse précisément cette image et réponds à la question suivante en français : "${query}". Fournis une réponse concise et professionnelle (50-100 mots max).`;
        const geminiPayload = {
          contents: [{
            parts: [
              { text: geminiPrompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
            ]
          }]
        };
        
        let geminiResponse;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            geminiResponse = await axios.post(
              GEMINI_API_URL,
              geminiPayload,
              { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
            );
            break;
          } catch (err) {
            if (attempt === 1) {
              await sendMessage(senderId, { text: 'Erreur : impossible d'analyser l'image après plusieurs tentatives. Réessaie ou contacte Messie Osango.' }, pageAccessToken);
              return;
            }
          }
        }
        
        const answer = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erreur : pas de réponse pour l'image.';
        conversationHistory[senderId].push({ role: 'user', content: query });
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
        return;
      }

      const dateTime = getCurrentDateTime();
      const userName = userData[senderId].name;
      const conversationHistoryString = conversationHistory[senderId].map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      conversationHistory[senderId].push({ role: 'user', content: query });
      
      if (needsCurrentInfo(query)) {
        const searchResults = await performGoogleSearch(query);
        if (searchResults) {
          const searchContext = searchResults.map((item, index) => 
            `${index + 1}. ${item.title}\n${item.snippet}\n${item.link}`
          ).join('\n\n');
          
          query = `Voici des informations récentes trouvées en ligne:\n${searchContext}\n\n${query}\nRéponds en utilisant ces informations si elles sont pertinentes.`;
        }
      }

      const prompt = `Tu t'appelles Messe IA, une IA créée par Messie Osango, conçue pour répondre avec précision en te basant sur tes connaissances et les informations fournies. Voici la date et l'heure ${dateTime}. Voici le nom de l'user : ${userName}. Historique de conversation : ${conversationHistoryString}. Question : "${query}".

1. Pour les questions générales, fournis une réponse concise et professionnelle (50-100 mots max) en français.
2. Pour les questions nécessitant des infos récentes, utilise les données fournies.
3. Si tu ne sais pas, réponds simplement "Je n'ai pas d'information à ce sujet."`;

      const response = await axios.post(
        GEMINI_API_URL,
        {
          contents: [
            ...conversationHistory[senderId].slice(-6).map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            })),
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      let answer = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Je n'ai pas de réponse à cette question.';
      conversationHistory[senderId].push({ role: 'assistant', content: answer });
      
      const messageChunks = chunkMessage(answer, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }
    } catch (err) {
      console.error('Erreur:', err.message, err.response?.data); 
      await sendMessage(senderId, { text: 'Oups, erreur serveur ! Réessaie ou contacte Messie Osango. 😅' }, pageAccessToken);
    }
  },
};
