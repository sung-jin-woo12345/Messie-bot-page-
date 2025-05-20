const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

const conversations = new Map();

const PROMPT_SYSTEM = {
  role: "system",
  content: "IA créée par Messie Osango. Réponses courtes et naturelles en français."
};

async function envoyerMessage(senderId, message, tokenPage) {
  try {
    const reponse = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${tokenPage}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text: message }
      })
    });
    return await reponse.json();
  } catch (erreur) {
    console.error('Erreur envoi message:', erreur);
  }
}

module.exports = {
  config: {
    name: "conversation",
    version: "4.2",
    author: "Messie Osango",
    countDown: 0,
    role: 0,
    shortDescription: "Bot Facebook IA",
    longDescription: "Assistant avec mémoire des conversations",
    category: "IA"
  },

  handleEvent: async function({ event, api }) {
    const message = event.body?.trim() || '';
    const senderId = event.senderID;
    const tokenPage = api.getAppToken();

    if (!message || /^[^\w\sÀ-ÿ]|prefix$/i.test(message)) return;

    try {
      if (!conversations.has(senderId)) {
        conversations.set(senderId, [PROMPT_SYSTEM]);
      }

      const historique = conversations.get(senderId);
      historique.push({ role: "user", content: message });

      if (historique.length > 8) historique.splice(1, 1);

      const reponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: historique,
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7
          }
        })
      });

      if (!reponse.ok) throw new Error(`Erreur API: ${reponse.status}`);

      const donnees = await reponse.json();
      const reponseIA = donnees.candidates?.[0]?.content?.parts?.[0]?.text || "Je ne peux pas répondre maintenant.";

      historique.push({ role: "model", content: reponseIA });
      await envoyerMessage(senderId, reponseIA, tokenPage);

    } catch (erreur) {
      console.error("Erreur conversation:", erreur);
      await envoyerMessage(senderId, 'Erreur de réponse. Veuillez contacter messie osango afin de l'informer.', tokenPage);
    }
  },

  onExit: function() {
    conversations.clear();
  }
};
