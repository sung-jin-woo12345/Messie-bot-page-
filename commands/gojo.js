const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

const FIREWORKS_API_KEY = 'fw_3ZUFwM2boU9JvizzBEr5HvJg';

module.exports = {
  name: 'gojo',
  description: 'Generate images via prompt using the Flux model.',
  usage: '€messie [prompt]',
  author: 'messie osango',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();

    try {
      const response = await axios.post(
        'https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image',
        { prompt },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'image/jpeg',
            'Authorization': `Bearer ${FIREWORKS_API_KEY}`
          },
          responseType: 'arraybuffer'
        }
      );

      const imageBuffer = Buffer.from(response.data);
      const tmpFilePath = path.join(__dirname, 'tmp_image.jpg');
      fs.writeFileSync(tmpFilePath, imageBuffer);

      const form = new FormData();
      form.append('message', JSON.stringify({
        attachment: {
          type: 'image',
          payload: { is_reusable: true }
        }
      }));
      form.append('filedata', fs.createReadStream(tmpFilePath));

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.data.attachment_id;

      await axios.post(
        `https://graph.facebook.com/v22.0/me/messages?access_token=${pageAccessToken}`,
        {
          recipient: { id: senderId },
          message: {
            attachment: {
              type: 'image',
              payload: {
                attachment_id: attachmentId
              }
            }
          }
        }
      );

      fs.unlinkSync(tmpFilePath);
    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '  Échec de la génération de l’image. Veuillez réessayer plus tard.
.' }, pageAccessToken);
    }
  }
};
