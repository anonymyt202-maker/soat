const { FONTS, TIMEZONES } = require('../config/constants');

function formatTime(date = new Date(), tzOffset = 5) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const local = new Date(utc + tzOffset * 3600000);
  const h = String(local.getHours()).padStart(2, '0');
  const m = String(local.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function applyFont(timeStr, fontKey) {
  const font = FONTS[fontKey] || FONTS.default;
  return font.transform(timeStr);
}

function formatNumber(n) {
  return Number(n).toLocaleString('uz-UZ');
}

function formatDate(dateStr) {
  if (!dateStr) return 'Kiritilmagan';
  try {
    const d = new Date(dateStr);
    const local = new Date(d.getTime() + 5 * 3600000);
    const pad = n => String(n).padStart(2, '0');
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  } catch { return dateStr; }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const now = new Date();
    const target = new Date(dateStr);
    target.setFullYear(now.getFullYear());
    if (target < now) target.setFullYear(now.getFullYear() + 1);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  } catch { return null; }
}

function daysUntilNewYear() {
  const now = new Date();
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.ceil((ny - now) / (1000 * 60 * 60 * 24));
}

function greetingByTime(tzOffset = 5) {
  const h = new Date().getUTCHours() + tzOffset;
  const hour = ((h % 24) + 24) % 24;
  if (hour >= 5 && hour < 12) return '🌅 Xayrli tong!';
  if (hour >= 12 && hour < 17) return '☀️ Xayrli kun!';
  if (hour >= 17 && hour < 22) return '🌆 Xayrli kech!';
  return '🌙 Xayrli tun!';
}

function getUserTzOffset(user) {
  const tzKey = user?.timezone || 'uz';
  return TIMEZONES[tzKey]?.offset ?? 5;
}

function getBioText(user, botUsername) {
  const type = user.bioType || 'clock';
  const tzOffset = getUserTzOffset(user);
  const time = formatTime(new Date(), tzOffset);

  if (type === 'clock') {
    if (user.tariff === 'free') {
      return `🌐Soat @${botUsername}  yordamida o'rnatildi 🕑`;
    }
    return applyFont(time, user.nickFont || 'default');
  }
  if (type === 'birthday') {
    const days = daysUntil(user.birthday);
    if (days === null) return applyFont(time, user.nickFont || 'default');
    if (days === 0) return '🎂 Bugun mening tug\'ilgan kunim! 🎉';
    return `🎂 Tug'ilgan kunimga: ${days} kun qoldi`;
  }
  if (type === 'newyear') {
    const days = daysUntilNewYear();
    return `🎉 Yangi yilga: ${days} kun qoldi`;
  }
  if (type === 'greeting') {
    return greetingByTime(tzOffset);
  }
  return applyFont(time, user.nickFont || 'default');
}

function maskCard(cardNumber) {
  const clean = cardNumber.replace(/\s/g, '');
  if (clean.length < 8) return cardNumber;
  return clean.slice(0, 4) + ' **** **** ' + clean.slice(-4);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  formatTime,
  applyFont,
  formatNumber,
  formatDate,
  daysUntil,
  daysUntilNewYear,
  greetingByTime,
  getUserTzOffset,
  getBioText,
  maskCard,
  sleep,
};
