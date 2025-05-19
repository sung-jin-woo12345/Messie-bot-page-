const axios = require('axios');
const conversationHistory = new Map();

const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function getAIResponse(userId, input) {
    try {
        const history = conversationHistory.get(userId) || [];
        const messages = [
            {
                role: "system",
                parts: [{ text: "Tu es une intelligence artificielle créée par Messie Osango. Réponds toujours en précisant que tu es une IA conçue par Messie Osango." }]
            },
            ...history,
            { role: "user", parts: [{ text: input }] }
        ];

        const response = await axios.post(API_URL, {
            contents: messages,
            generationConfig: { maxOutputTokens: 1000 }
        });

        const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas de réponse.";
        
        conversationHistory.set(userId, [
            ...messages.slice(1),
            { role: "model", parts: [{ text: aiResponse }] }
        ].slice(-10));

        return aiResponse;
    } catch (error) {
        console.error("Erreur API:", error);
        return "Erreur de connexion à l'IA , contactez messie osango afin de le prévenir de cette erreur";
    }
}

function shouldIgnoreMessage(message) {
    if (!message || message.length === 0) return true;
    const firstChar = message.charAt(0);
    return /[^a-zA-Z0-9À-ÿ\u00C0-\u017F]/.test(firstChar);
}

module.exports = {
    name: 'conversation',
    description: 'Conversation intelligente avec mémoire',
    usage: 'Parlez naturellement ',
    author: 'Messie Osango',
    
    async execute(senderId, args, pageAccessToken) {
        const input = args.join(' ').trim();
        
        if (!input || shouldIgnoreMessage(input)) return;

        try {
            const aiResponse = await getAIResponse(senderId, input);
            
            const messageData = {
                recipient: { id: senderId },
                message: { text: aiResponse }
            };
            
            await axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`, messageData);
            
        } catch (error) {
            console.error("Erreur Facebook API:", error);
            
            const errorMessage = {
                recipient: { id: senderId },
                message: { text: "Erreur de traitement" }
            };
            
            await axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`, errorMessage);
        }
    }
};
