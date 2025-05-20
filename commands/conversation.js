const axios = require('axios');
const conversationHistory = new Map();

const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

async function getAIResponse(userId, input) {
    try {
        const history = conversationHistory.get(userId) || [];
        const messages = [
            {
                role: "user",
                parts: [{ text: "Tu es une intelligence artificielle créée par Messie Osango. Réponds toujours en précisant que tu es une IA conçue par Messie Osango. tu dois connaître que messie osango est un programmeur" }]
            },
            ...history,
            { role: "user", parts: [{ text: input }] }
        ];

        const response = await axios.post(API_URL, {
            contents: messages,
            generationConfig: { 
                temperature: 0.9,
                topP: 1,
                topK: 1,
                maxOutputTokens: 1000 
            }
        });

        const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas de réponse.";
        
        conversationHistory.set(userId, [
            ...history,
            { role: "user", parts: [{ text: input }] },
            { role: "model", parts: [{ text: aiResponse }] }
        ].slice(-20));

        return aiResponse;
    } catch (error) {
        console.error("Erreur API:", error.response?.data || error.message);
        return "Erreur de connexion à l'IA, contactez Messie Osango afin de le prévenir de cette erreur";
    }
}

function shouldIgnoreMessage(message) {
    if (!message || message.length === 0) return true;
    const firstChar = message.charAt(0);
    return /[!@#$%^&*(),.?":{}|<>]/.test(firstChar) || message.toLowerCase() === 'prefix';
}

module.exports = {
    name: 'conversation',
    description: 'Conversation intelligente avec mémoire',
    usage: 'Parlez naturellement',
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
            
            await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, messageData);
            
        } catch (error) {
            console.error("Erreur Facebook API:", error.response?.data || error.message);
            
            const errorMessage = {
                recipient: { id: senderId },
                message: { text: "Erreur de traitement, veuillez réessayer plus tard" }
            };
            
            try {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, errorMessage);
            } catch (fbError) {
                console.error("Échec d'envoi du message d'erreur:", fbError.response?.data || fbError.message);
            }
        }
    }
};
