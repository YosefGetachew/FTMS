const SMS_API_URL = process.env.SMS_API_URL;
const SMS_API_TOKEN = process.env.SMS_API_TOKEN;
const SMS_API_METHOD = (process.env.SMS_API_METHOD || 'POST').toUpperCase();
const SMS_FROM = process.env.SMS_FROM || 'FTMS';
const SMS_TO_FIELD = process.env.SMS_TO_FIELD || 'to';
const SMS_MESSAGE_FIELD = process.env.SMS_MESSAGE_FIELD || 'message';
const SMS_FROM_FIELD = process.env.SMS_FROM_FIELD || 'from';

const isSmsEnabled = () =>
  String(process.env.SMS_ENABLED || '').toLowerCase() === 'true' &&
  Boolean(SMS_API_URL);

const compactMessage = (message) =>
  String(message || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);

const sendSms = async ({ to, message }) => {
  if (!isSmsEnabled() || !to || !message) return { skipped: true };

  const payload = {
    [SMS_TO_FIELD]: to,
    [SMS_MESSAGE_FIELD]: compactMessage(message),
  };

  if (SMS_FROM) {
    payload[SMS_FROM_FIELD] = SMS_FROM;
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (SMS_API_TOKEN) {
    headers.Authorization = `Bearer ${SMS_API_TOKEN}`;
  }

  const response = await fetch(SMS_API_URL, {
    method: SMS_API_METHOD,
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SMS gateway error ${response.status}: ${text}`);
  }

  return { sent: true };
};

module.exports = {
  sendSms,
  isSmsEnabled,
};
