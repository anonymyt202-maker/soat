const fs = require('fs');
const path = require('path');
const config = require('../config');

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const defaultData = filePath.includes('users') ? {} : [];
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[DB] Error reading ${filePath}:`, e.message);
    return filePath.includes('users') ? {} : [];
  }
}

function writeJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`[DB] Error writing ${filePath}:`, e.message);
    return false;
  }
}

const Users = {
  getAll() { return readJSON(config.paths.users); },
  get(userId) {
    const users = readJSON(config.paths.users);
    return users[String(userId)] || null;
  },
  save(userId, data) {
    const users = readJSON(config.paths.users);
    users[String(userId)] = { ...users[String(userId)], ...data };
    writeJSON(config.paths.users, users);
    return users[String(userId)];
  },
  create(userId, ctx) {
    const existing = this.get(userId);
    if (existing) return existing;
    const user = {
      id: userId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
      balance: 0,
      tariff: 'free',
      tariffExpires: null,
      joinDate: new Date().toISOString(),
      clockInstalled: false,
      nickClockOn: false,
      bioClockOn: false,
      onlineMode: false,
      birthday: null,
      nickFont: 'default',
      bioType: 'clock',
      banned: false,
      state: null,
      stateData: {},
      pendingPayment: null,
    };
    this.save(userId, user);
    return user;
  },
  delete(userId) {
    const users = readJSON(config.paths.users);
    delete users[String(userId)];
    writeJSON(config.paths.users, users);
  },
  count() { return Object.keys(readJSON(config.paths.users)).length; },
};

const Payments = {
  getAll() { return readJSON(config.paths.payments); },
  add(payment) {
    const payments = readJSON(config.paths.payments);
    const p = { ...payment, id: Date.now().toString(), createdAt: new Date().toISOString() };
    payments.push(p);
    writeJSON(config.paths.payments, payments);
    return p;
  },
  update(paymentId, data) {
    const payments = readJSON(config.paths.payments);
    const idx = payments.findIndex(p => p.id === paymentId);
    if (idx !== -1) {
      payments[idx] = { ...payments[idx], ...data };
      writeJSON(config.paths.payments, payments);
      return payments[idx];
    }
    return null;
  },
  getByUser(userId) {
    return readJSON(config.paths.payments).filter(p => String(p.userId) === String(userId));
  },
  getPending() {
    return readJSON(config.paths.payments).filter(p => p.status === 'pending');
  },
};

const Cards = {
  getAll() { return readJSON(config.paths.cards); },
  getByType(type) {
    const cards = readJSON(config.paths.cards);
    return cards[type] || [];
  },
  add(type, cardData) {
    const cards = readJSON(config.paths.cards);
    if (!cards[type]) cards[type] = [];
    cards[type].push({ ...cardData, id: Date.now().toString() });
    writeJSON(config.paths.cards, cards);
  },
  remove(type, cardId) {
    const cards = readJSON(config.paths.cards);
    if (cards[type]) {
      cards[type] = cards[type].filter(c => c.id !== cardId);
      writeJSON(config.paths.cards, cards);
    }
  },
};

const Tariffs = {
  getAll() { return readJSON(config.paths.tariffs); },
  get(id) {
    const tariffs = readJSON(config.paths.tariffs);
    return tariffs[id] || null;
  },
  update(id, data) {
    const tariffs = readJSON(config.paths.tariffs);
    if (tariffs[id]) {
      tariffs[id] = { ...tariffs[id], ...data };
      writeJSON(config.paths.tariffs, tariffs);
      return tariffs[id];
    }
    return null;
  },
};

const Channels = {
  getAll() { return readJSON(config.paths.channels); },
  add(channel) {
    const channels = readJSON(config.paths.channels);
    if (!channels.find(c => c.id === channel.id)) {
      channels.push(channel);
      writeJSON(config.paths.channels, channels);
    }
  },
  remove(channelId) {
    let channels = readJSON(config.paths.channels);
    channels = channels.filter(c => String(c.id) !== String(channelId));
    writeJSON(config.paths.channels, channels);
  },
};

const Logs = {
  add(entry) {
    try {
      const logs = readJSON(config.paths.logs);
      logs.unshift({ ...entry, time: new Date().toISOString() });
      if (logs.length > 500) logs.splice(500);
      writeJSON(config.paths.logs, logs);
    } catch (e) {}
  },
  getRecent(n = 50) {
    return readJSON(config.paths.logs).slice(0, n);
  },
};

module.exports = { Users, Payments, Cards, Tariffs, Channels, Logs };
