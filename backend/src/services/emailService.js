import brevo from '@getbrevo/brevo';

let apiInstance = null;
const apiKey = process.env.BREVO_API_KEY;

if (apiKey && apiKey !== 'xkeysib-mock-api-key-for-dev' && !apiKey.startsWith('mock')) {
  const defaultClient = brevo.ApiClient.instance;
  const apiKeyAuth = defaultClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;
  apiInstance = new brevo.TransactionalEmailsApi();
}

/**
 * Safe email sender that uses Brevo API when configured,
 * or logs cleanly to server output in development mode.
 */
export const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  const senderEmail = process.env.EMAIL_FROM || 'weldmonitor@industrial.io';
  const senderName = process.env.EMAIL_FROM_NAME || 'WeldMonitor System';

  if (!apiInstance) {
    console.log(`\n📨 [Email Service Mock/Dev]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${textContent || htmlContent?.replace(/<[^>]*>?/gm, '')}`);
    console.log(`----------------------------------------\n`);
    return { success: true, simulated: true };
  }

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: to }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Brevo Email Sent successfully, messageId:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('⚠️ Brevo Email Send Failed (non-blocking):', error.message);
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  const subject = 'WeldMonitor - Password Reset Request';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 30px; border-radius: 8px;">
      <h2 style="color: #00f2fe; margin-bottom: 20px;">WeldMonitor Industrial Platform</h2>
      <p>Hello ${userName || 'Operator'},</p>
      <p>You have requested to reset your account password. Click the secure link below to proceed:</p>
      <div style="margin: 25px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">This token expires in 1 hour. If you did not initiate this request, please ignore this email or notify your system administrator.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `Reset your WeldMonitor password: ${resetUrl}`,
  });
};

export const sendCriticalAlertEmail = async (recipientEmail, alertData) => {
  const subject = `⚠️ CRITICAL INDUSTRIAL ALERT: Machine ${alertData.machineId} Fault`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 30px; border-radius: 8px; border-left: 6px solid #f43f5e;">
      <h2 style="color: #f43f5e; margin-bottom: 15px;">CRITICAL FAULT DETECTED</h2>
      <p><strong>Machine ID:</strong> ${alertData.machineId}</p>
      <p><strong>Severity:</strong> <span style="color: #f43f5e; font-weight: bold;">CRITICAL</span></p>
      <p><strong>Category:</strong> ${alertData.category}</p>
      <p><strong>Description:</strong> ${alertData.message}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div style="margin-top: 20px; padding: 12px; background-color: #1e293b; border-radius: 6px;">
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">Please log into the WeldMonitor Control Center immediately to investigate and acknowledge this incident.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    htmlContent,
    textContent: `CRITICAL FAULT: Machine ${alertData.machineId} - ${alertData.message}`,
  });
};
