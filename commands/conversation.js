const API_KEY = "AIzaSyBQeZVi4QdrnGKPEfXXx1tdIqlMM8iqvZw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

const activeChats = new Map();

module.exports = {
  config: {
    name: "conversation",
    version: "3.1",
    author: "Messie Osango",
    countDown: 0,
    role: 0,
    shortDescription: "Bot Facebook Pro",
    longDescription: "IA Messenger avec filtres stricts",
    category: "100% Facebook"
  },

  handleEvent: async function({ event, message }) {
    const msg = event.body?.trim() || '';
    if (
      !msg || 
      /^[\!@#\$%\^&\*\(\)_\+\-=\[\]\{\};':"\\\|,.<>\/?€£¥§±]+$/.test(msg) ||
      /^\W|\bprefix\b/i.test(msg)
    ) return;

    try {
      const senderID = event.senderID;
      
      if (!activeChats.has(senderID)) {
        activeChats.set(senderID, [{
          role: "system",
          content: "IA Facebook créée exclusivement par Messie Osango. Réponses courtes et précises."
        }]);
      }

      const chat = activeChats.get(senderID);
      chat.push({ role: "user", content: msg });

      while (chat.length > 6) chat.splice(1, 1);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: chat,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.9
          }
        })
      });

      const reply = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "👍";
      await message.reply(reply);
      chat.push({ role: "model", content: reply });

    } catch {
    }
  },

  onExit: function() {
    activeChats.clear();
  }
};
