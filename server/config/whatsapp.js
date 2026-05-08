/**
 * WhatsApp Configuration using Twilio
 */

const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Function to send WhatsApp message
async function sendWhatsAppMessage(nominationData) {
    try {
        const { contestant_name, event_name, category_name, nominator_name, contestant_phone } = nominationData;
        
        const message = `
🎯 *NEW NOMINATION RECEIVED!* 🎯

*Contestant:* ${contestant_name}
*Event:* ${event_name}
*Category:* ${category_name}
*Nominated by:* ${nominator_name}
*Contact:* ${contestant_phone || 'Not provided'}

📱 TekVotes Voting Platform
        `;
        
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: process.env.TWILIO_WHATSAPP_TO
        });
        
        console.log('✅ WhatsApp message sent:', response.sid);
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error('WhatsApp error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendWhatsAppMessage };