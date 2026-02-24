const axios = require('axios');

// Send a transactional email via Brevo HTTP API.
// Pass qrBase64 (pure base64 string, no data: prefix) to embed QR as inline attachment.
 
const sendEmail = async ({ to, toName, subject, htmlContent, qrBase64 }) => {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        console.warn('Email not configured — skipping send.');
        return;
    }

    const payload = {
        sender: {
            name: process.env.BREVO_SENDER_NAME || 'FeliGo',
            email: process.env.BREVO_SENDER_EMAIL
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent
    };
    if (qrBase64) {
        payload.attachment = [{
            name: 'qrcode.png',
            content: qrBase64 
        }];
    }

    try {
        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            payload,
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (err) {
        console.error('Email send error:', err.response?.data || err.message);
    }
};

/**
 * Build the ticket email HTML.
 * When qrBase64 is provided, the QR image is embedded via CID (cid:qrcode.png).
 * The actual base64 content is passed separately to sendEmail as an attachment.
 */
const buildTicketEmail = ({ participantName, eventName, eventDate, eventLocation, organizer, ticketId, registeredAt, type, qrBase64, responses, price }) => {
    const qrSection = qrBase64
        ? `<div style="text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Your Entry QR Code</p>
            <img src="cid:qrcode.png" alt="Entry QR Code" style="width: 180px; height: 180px; border: 1px solid #e5e7eb; border-radius: 8px;" />
            <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">Present this QR code at the venue for check-in.</p>
          </div>`
        : '';

    const variantRows = (type === 'merchandise' && responses && Object.keys(responses).length > 0)
        ? Object.entries(responses).map(([k, v]) =>
            `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 140px;">${k}</td><td style="font-weight: bold; color: #7c3aed;">${v}</td></tr>`
          ).join('')
        : '';

    const priceRow = (type === 'merchandise' && price !== undefined)
        ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Amount</td><td style="font-weight: bold; color: #111827;">${price === 0 ? 'Free' : '₹' + price}</td></tr>`
        : '';

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #2563eb; color: white; padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 22px;">FeliGo — ${type === 'merchandise' ? 'Purchase' : 'Registration'} Confirmation</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #374151;">Hi <strong>${participantName}</strong>,</p>
        <p style="color: #374151;">Your ${type === 'merchandise' ? 'purchase' : 'registration'} for <strong>${eventName}</strong> is confirmed.</p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 140px;">Event</td><td style="font-weight: bold; color: #111827;">${eventName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Organizer</td><td style="color: #111827;">${organizer}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Date</td><td style="color: #111827;">${new Date(eventDate).toLocaleString()}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Location</td><td style="color: #111827;">${eventLocation || 'TBA'}</td></tr>
            ${variantRows}
            ${priceRow}
            <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Registered At</td><td style="color: #111827;">${new Date(registeredAt).toLocaleString()}</td></tr>
          </table>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Ticket ID</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1d4ed8; font-family: monospace;">${ticketId}</p>
        </div>

        ${qrSection}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">FeliGo — Felicity Event Management System</p>
      </div>
    </div>
    `;
};

module.exports = { sendEmail, buildTicketEmail };
