const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'lyrics',
  description: 'Fetch song lyrics',
  usage: 'lyrics [song name]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    try {
      const { data } = await axios.get(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(args.join(' '))}`);
      if (data?.lyrics) {
        const messages = splitMessage(data.title, data.artist, data.lyrics, 2000);
        messages.forEach(message => sendMessage(senderId, { text: message }, pageAccessToken));
        if (data.image) sendMessage(senderId, { attachment: { type: 'image', payload: { url: data.image, is_reusable: true } } }, pageAccessToken);
      } else {
        sendMessage(senderId, { text: 'Sorry, no lyrics were found for your query.' }, pageAccessToken);
      }
    } catch {
      sendMessage(senderId, { text: 'Sorry, there was an error processing your request.' }, pageAccessToken);
    }
  }
};

const splitMessage = (title, artist, lyrics, chunkSize) => {
  const message = `Title: ${title}\nArtist: ${artist}\n\n${lyrics}`;
  return Array.from({ length: Math.ceil(message.length / chunkSize) }, (_, i) => message.slice(i * chunkSize, (i + 1) * chunkSize));
};
