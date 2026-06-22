const { Users } = require('../database/db');
const { updateLastName, updateBio, setOnlineStatus, hasSession } = require('./mtproto');
const { formatTime, applyFont, getBioText, getUserTzOffset } = require('../utils/helpers');
const config = require('../config');
const { Logs } = require('../database/db');

let clockInterval = null;
let bot = null;
let isRunning = false;

function setBotInstance(botInstance) {
  bot = botInstance;
}

async function tickUser(userId, user) {
  if (!hasSession(userId)) return;

  const tzOffset = getUserTzOffset(user);
  const time = formatTime(new Date(), tzOffset);
  const tariff = user.tariff || 'free';

  if (user.nickClockOn) {
    const formatted = applyFont(time, user.nickFont || 'default');
    const result = await updateLastName(userId, formatted);
    if (result.sessionExpired) {
      Users.save(userId, { nickClockOn: false, bioClockOn: false, clockInstalled: false, onlineMode: false });
      if (bot) {
        try {
          await bot.telegram.sendMessage(
            userId,
            '😕 Kechirasiz, siz botni akkauntingizdan chiqarib yubordingiz — soat endi ishlamaydi!\n\n' +
            'Agar yana soat o\'rnatishni istasangiz "Soat O\'rnatish 🕒" bo\'limidan foydalanishingiz mumkin!'
          );
        } catch {}
      }
      return;
    }
  }

  if (user.bioClockOn && (tariff === 'plus' || tariff === 'premium')) {
    const bioText = getBioText(user, config.bot.username);
    await updateBio(userId, bioText);
  } else if (tariff === 'free' && user.clockInstalled) {
    const bioText = `Soat @${config.bot.username} bot yordamida qo'yildi 🕑`;
    await updateBio(userId, bioText);
  }

  if (user.onlineMode && tariff === 'premium') {
    await setOnlineStatus(userId);
  }
}

async function runClockTick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const allUsers = Users.getAll();
    const activeUsers = Object.entries(allUsers).filter(([, u]) =>
      u.clockInstalled && !u.banned && (u.nickClockOn || u.bioClockOn || u.onlineMode)
    );

    for (const [userId, user] of activeUsers) {
      try {
        await tickUser(userId, user);
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        Logs.add({ type: 'clock_error', userId, error: e.message });
      }
    }
  } catch (e) {
    Logs.add({ type: 'clock_tick_error', error: e.message });
  } finally {
    isRunning = false;
  }
}

function startClockService(botInstance) {
  bot = botInstance;
  if (clockInterval) {
    clearInterval(clockInterval);
  }
  clockInterval = setInterval(runClockTick, config.clock.intervalMs);
  console.log('[ClockService] Started — interval:', config.clock.intervalMs, 'ms');
  runClockTick();
}

function stopClockService() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
    console.log('[ClockService] Stopped');
  }
}

function restartClockService() {
  stopClockService();
  startClockService(bot);
  return true;
}

async function installClockForUser(userId) {
  const user = Users.get(userId);
  if (!user) return false;

  Users.save(userId, { clockInstalled: true, nickClockOn: true });

  const tzOffset = getUserTzOffset(user);
  const time = formatTime(new Date(), tzOffset);
  const formatted = applyFont(time, user.nickFont || 'default');
  const result = await updateLastName(userId, formatted);

  if (result.success) {
    if (user.tariff === 'free') {
      await updateBio(userId, `Soat @${config.bot.username} bot yordamida qo'yildi 🕑`);
    }
    Logs.add({ type: 'clock_install', userId });
    return true;
  }
  return false;
}

module.exports = {
  startClockService,
  stopClockService,
  restartClockService,
  installClockForUser,
  setBotInstance,
  runClockTick,
};
