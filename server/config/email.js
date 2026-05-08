/**
 * Email Configuration using Nodemailer
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to send nomination email
async function sendNominationEmail(nominationData) {
    try {
        const { contestant_name, contestant_phone, contestant_email, nominator_name, nominator_email, nominator_phone, reason, event_name, category_name, photo_url } = nominationData;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `🎯 New Nomination Received: ${contestant_name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #D4AF37, #E8C860); color: #111; padding: 20px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { padding: 30px; }
                        .info-row { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
                        .info-label { font-weight: bold; color: #D4AF37; width: 120px; display: inline-block; }
                        .info-value { color: #333; }
                        .photo { text-align: center; margin: 20px 0; }
                        .photo img { max-width: 300px; border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
                        .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                        .badge { display: inline-block; background: #D4AF37; color: #111; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✨ New Nomination Received ✨</h1>
                            <p>TekVotes Voting Platform</p>
                        </div>
                        <div class="content">
                            <div class="info-row">
                                <span class="info-label">🎭 Contestant:</span>
                                <span class="info-value"><strong>${contestant_name}</strong></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📞 Contestant Phone:</span>
                                <span class="info-value">${contestant_phone || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📧 Contestant Email:</span>
                                <span class="info-value">${contestant_email || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">🏆 Event:</span>
                                <span class="info-value">${event_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📂 Category:</span>
                                <span class="info-value">${category_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📝 Reason:</span>
                                <span class="info-value">${reason}</span>
                            </div>
                            ${photo_url ? `<div class="photo"><img src="${photo_url}" alt="Contestant Photo"></div>` : ''}
                            <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                                <h3>👤 Nominator Information</h3>
                                <p><strong>Name:</strong> ${nominator_name}</p>
                                <p><strong>Email:</strong> ${nominator_email}</p>
                                <p><strong>Phone:</strong> ${nominator_phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div class="footer">
                            <p>TekVotes Voting Platform | Powered by Paystack</p>
                            <p>Review this nomination in the admin dashboard</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendNominationEmail };