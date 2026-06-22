const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const sessionsDir = path.resolve(config.paths.sessions);
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

const pendingClients = new Map();

function encryptSession(str) {
  try {
    const key = Buffer.from(config.encryption.key.slice(0, 32).padEnd(32, '0'));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch {
    return str;
  }
}

function decryptSession(str) {
  try {
    const parts = str.split(':');
    if (parts.length < 2) return str;
    const ivHex = parts[0];
    const encrypted = parts.slice(1).join(':');
    const key = Buffer.from(config.encryption.key.slice(0, 32).padEnd(32, '0'));
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return str;
  }
}

function saveSession(userId, sessionStr) {
  const filePath = path.join(sessionsDir, `${userId}.json`);
  const data = {
    session: encryptSession(sessionStr),
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadSession(userId) {
  const filePath = path.join(sessionsDir, `${userId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return decryptSession(data.session);
  } catch {
    return null;
  }
}

function deleteSession(userId) {
  const filePath = path.join(sessionsDir, `${userId}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function hasSession(userId) {
  return fs.existsSync(path.join(sessionsDir, `${userId}.json`));
}

function getAllSessions() {
  if (!fs.existsSync(sessionsDir)) return [];
  return fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

function getErrCode(e) {
  return e.errorMessage || e.message || String(e);
}

function makeClient(sessionStr = '') {
  const session = new StringSession(sessionStr);
  return new TelegramClient(session, config.telegram.apiId, config.telegram.apiHash, {
    connectionRetries: 5,
    retryDelay: 1000,
    autoReconnect: true,
    timeout: 30,
    requestRetries: 3,
    deviceModel: 'Desktop',
    systemVersion: 'Windows 10',
    appVersion: '1.0.0',
    langCode: 'uz',
    useWSS: false,
  });
}

async function sendCode(userId, phoneNumber) {
  await cleanupPending(userId);
  try {
    const client = makeClient();
    await client.connect();
    const result = await client.sendCode(
      { apiId: config.telegram.apiId, apiHash: config.telegram.apiHash },
      phoneNumber
    );
    pendingClients.set(String(userId), {
      client,
      phoneCodeHash: result.phoneCodeHash,
      phone: phoneNumber,
    });
    return { success: true };
  } catch (e) {
    const code = getErrCode(e);
    if (code.includes('PHONE_NUMBER_INVALID')) {
      return { success: false, error: 'Telefon raqam noto\'g\'ri.' };
    }
    if (code.includes('FLOOD_WAIT')) {
      const secs = code.match(/\d+/)?.[0] || '60';
      return { success: false, error: `Juda ko'p urinish. ${secs} soniya kuting.` };
    }
    return { success: false, error: `Xatolik: ${e.message || code}` };
  }
}

async function signIn(userId, phoneCode) {
  const pending = pendingClients.get(String(userId));
  if (!pending) return { success: false, error: 'Sessiya topilmadi. Qaytadan boshlang.', needRestart: true };

  const { client, phoneCodeHash, phone } = pending;

  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash,
      phoneCode,
    }));

    const sessionStr = client.session.save();
    saveSession(userId, sessionStr);
    pendingClients.delete(String(userId));
    return { success: true };
  } catch (e) {
    const code = getErrCode(e);

    if (code.includes('SESSION_PASSWORD_NEEDED')) {
      return { success: false, need2FA: true };
    }
    if (code.includes('PHONE_CODE_INVALID')) {
      return { success: false, error: 'Kod noto\'g\'ri. Qaytadan kiriting.' };
    }
    if (code.includes('PHONE_CODE_EXPIRED')) {
      await cleanupPending(userId);
      return { success: false, error: 'Kod muddati o\'tdi. Qaytadan boshlang.', needRestart: true };
    }
    if (code.includes('PHONE_CODE_EMPTY')) {
      return { success: false, error: 'Kod bo\'sh. Qaytadan kiriting.' };
    }
    if (code.includes('FLOOD_WAIT')) {
      const secs = code.match(/\d+/)?.[0] || '60';
      return { success: false, error: `Juda ko'p urinish. ${secs} soniya kuting.` };
    }
    return { success: false, error: `Xatolik: ${e.message || code}` };
  }
}

async function signInWith2FA(userId, password) {
  const pending = pendingClients.get(String(userId));
  if (!pending) return { success: false, error: 'Sessiya topilmadi. Qaytadan boshlang.', needRestart: true };

  const { client } = pending;

  try {
    await client.signInWithPassword(
      { apiId: config.telegram.apiId, apiHash: config.telegram.apiHash },
      {
        password: async () => password,
        onError: (err) => {
          throw err;
        },
      }
    );

    const sessionStr = client.session.save();
    saveSession(userId, sessionStr);
    pendingClients.delete(String(userId));
    return { success: true };
  } catch (e) {
    const code = getErrCode(e);
    if (code.includes('PASSWORD_HASH_INVALID')) {
      return { success: false, error: 'Parol noto\'g\'ri. Qaytadan kiriting.' };
    }
    if (code.includes('FLOOD_WAIT')) {
      const secs = code.match(/\d+/)?.[0] || '60';
      return { success: false, error: `Juda ko'p urinish. ${secs} soniya kuting.` };
    }
    return { success: false, error: `Xatolik: ${e.message || code}` };
  }
}

async function getClientForUser(userId) {
  const sessionStr = loadSession(userId);
  if (!sessionStr) return null;
  try {
    const client = makeClient(sessionStr);
    await client.connect();
    if (!await client.isUserAuthorized()) {
      deleteSession(userId);
      return null;
    }
    return client;
  } catch {
    return null;
  }
}

async function updateLastName(userId, lastName) {
  let client = null;
  try {
    client = await getClientForUser(userId);
    if (!client) return { success: false, error: 'Session topilmadi', sessionExpired: true };

    await client.invoke(new Api.account.UpdateProfile({ lastName }));
    return { success: true };
  } catch (e) {
    const code = getErrCode(e);
    if (code.includes('AUTH_KEY') || code.includes('UNAUTHORIZED') || code.includes('USER_DEACTIVATED')) {
      deleteSession(userId);
      return { success: false, error: 'Session muddati o\'tdi', sessionExpired: true };
    }
    return { success: false, error: e.message || code };
  } finally {
    if (client) { try { await client.disconnect(); } catch {} }
  }
}

async function updateBio(userId, bio) {
  let client = null;
  try {
    client = await getClientForUser(userId);
    if (!client) return { success: false, error: 'Session topilmadi', sessionExpired: true };

    await client.invoke(new Api.account.UpdateProfile({ about: bio }));
    return { success: true };
  } catch (e) {
    const code = getErrCode(e);
    if (code.includes('AUTH_KEY') || code.includes('UNAUTHORIZED') || code.includes('USER_DEACTIVATED')) {
      deleteSession(userId);
      return { success: false, error: 'Session muddati o\'tdi', sessionExpired: true };
    }
    return { success: false, error: e.message || code };
  } finally {
    if (client) { try { await client.disconnect(); } catch {} }
  }
}

async function setOnlineStatus(userId) {
  let client = null;
  try {
    client = await getClientForUser(userId);
    if (!client) return { success: false };
    await client.invoke(new Api.account.UpdateStatus({ offline: false }));
    return { success: true };
  } catch {
    return { success: false };
  } finally {
    if (client) { try { await client.disconnect(); } catch {} }
  }
}

async function cleanupPending(userId) {
  const pending = pendingClients.get(String(userId));
  if (pending) {
    try { await pending.client.disconnect(); } catch {}
    pendingClients.delete(String(userId));
  }
}

module.exports = {
  sendCode,
  signIn,
  signInWith2FA,
  getClientForUser,
  updateLastName,
  updateBio,
  setOnlineStatus,
  saveSession,
  loadSession,
  deleteSession,
  hasSession,
  getAllSessions,
  cleanupPending,
};
