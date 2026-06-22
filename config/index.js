require('dotenv').config();

const config = {
  bot: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME || 'soat_bot',
  },
  admins: (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),
  telegram: {
    apiId: parseInt(process.env.API_ID),
    apiHash: process.env.API_HASH,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'defaultkey32charslong_changeme!!',
  },
  dev: {
    username: process.env.DEV_USERNAME || '@admin',
  },
  paths: {
    users: './data/users.json',
    payments: './data/payments.json',
    cards: './data/cards.json',
    tariffs: './data/tariffs.json',
    channels: './data/channels.json',
    logs: './data/logs.json',
    sessions: './sessions',
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 30,
  },
  clock: {
    intervalMs: 60 * 1000,
  },
};

module.exports = config;
