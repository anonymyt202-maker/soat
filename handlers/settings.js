const { Users, Tariffs } = require('../database/db');
const {
  settingsKeyboard, nickSettingsKeyboard, bioSettingsKeyboard,
  fontKeyboard, bioTypeKeyboard, cancelKeyboard, mainMenuKeyboard,
  generalSettingsKeyboard, timezoneKeyboard,
} = require('../utils/keyboards');
const { FONTS, BIO_TYPES, TARIFF_NAMES, TIMEZONES } = require('../config/constants');
const { formatTime, applyFont, getUserTzOffset } = require('../utils/helpers');

async function handleSettings(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');
  await ctx.answerCbQuery();

  const text = '⚙️ <b>Soat sozlamalari</b>\n\nQuyidagi bo\'limlardan birini tanlang:';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...settingsKeyboard() });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...settingsKeyboard() });
  }
}

async function handleGeneralSettings(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  if (ctx.callbackQuery) await ctx.answerCbQuery();

  const onlineStatus = user.onlineMode ? '🟢 Yoniq' : '🔴 O\'chiq';
  const tzKey = user.timezone || 'uz';
  const tzInfo = TIMEZONES[tzKey] || TIMEZONES.uz;

  const text =
    `⚙️ <b>Umumiy sozlamalar</b>\n\n` +
    `🌐 Online rejim: <b>${onlineStatus}</b>\n` +
    `🌍 Vaqt hududi: <b>${tzInfo.name} (${tzInfo.label})</b>\n\n` +
    `ℹ️ Online rejim faqat <b>Premium ⭐️</b> tarifida mavjud`;

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...generalSettingsKeyboard(user) });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...generalSettingsKeyboard(user) });
  }
}

async function handleOnlineToggle(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  if (!user.clockInstalled) {
    return ctx.answerCbQuery('❌ Avval soatni o\'rnating!', { show_alert: true });
  }
  if (user.tariff !== 'premium') {
    return ctx.answerCbQuery('❌ Bu funksiya faqat Premium ⭐️ tarifida mavjud!', { show_alert: true });
  }

  const newState = !user.onlineMode;
  Users.save(userId, { onlineMode: newState });
  await ctx.answerCbQuery(newState ? '✅ Online rejim yoqildi' : '🔴 Online rejim o\'chirildi');
  await handleGeneralSettings(ctx);
}

async function handleTimezoneMenu(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  const currentTz = user.timezone || 'uz';
  const text = '🌍 <b>Vaqt hududini tanlang:</b>\n\nVaqt hududini tanlash soat aks ettiradigan vaqtni o\'zgartiradi.';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...timezoneKeyboard(currentTz) });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...timezoneKeyboard(currentTz) });
  }
}

async function handleTimezoneSelect(ctx, tzKey) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  const tzInfo = TIMEZONES[tzKey];
  if (!tzInfo) return ctx.answerCbQuery('❌ Noto\'g\'ri vaqt hududi');

  Users.save(userId, { timezone: tzKey });
  await ctx.answerCbQuery(`✅ ${tzInfo.name} tanlandi`, { show_alert: true });
  await handleGeneralSettings(ctx);
}

async function handleNickSettings(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  const status = user.nickClockOn ? '🟢 Yoniq' : '🔴 O\'chiq';
  const font = FONTS[user.nickFont || 'default']?.name || 'Default';
  const tzOffset = getUserTzOffset(user);
  const preview = applyFont(formatTime(new Date(), tzOffset), user.nickFont || 'default');

  const text =
    `👤 <b>Nickdagi soat sozlamalari</b>\n\n` +
    `📊 Holat: <b>${status}</b>\n` +
    `📝 Font: <b>${font}</b>\n` +
    `✨ Misol: <code>${preview}</code>`;

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...nickSettingsKeyboard(user) });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...nickSettingsKeyboard(user) });
  }
}

async function handleNickToggle(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  if (!user.clockInstalled) {
    return ctx.answerCbQuery('❌ Avval soatni o\'rnating!', { show_alert: true });
  }

  const newState = !user.nickClockOn;
  Users.save(userId, { nickClockOn: newState });
  await ctx.answerCbQuery(newState ? '✅ Nick soat yoqildi' : '🔴 Nick soat o\'chirildi');
  await handleNickSettings(ctx);
}

async function handleNickFont(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  const text = '🔤 <b>Font tanlang:</b>\n\n(Sizning tarifingizga qarab fontlar ko\'rinadi)';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...fontKeyboard(user.tariff) });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...fontKeyboard(user.tariff) });
  }
}

async function handleFontSelect(ctx, fontKey) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  Users.save(userId, { nickFont: fontKey });
  const tzOffset = getUserTzOffset(user);
  const preview = applyFont(formatTime(new Date(), tzOffset), fontKey);
  await ctx.answerCbQuery(`✅ Font tanlandi: ${FONTS[fontKey]?.name}\nMisol: ${preview}`, { show_alert: true });
  await handleNickSettings(ctx);
}

async function handleBioSettings(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  const status = user.bioClockOn ? '🟢 Yoniq' : '🔴 O\'chiq';
  const bioTypeName = BIO_TYPES[user.bioType || 'clock']?.name || 'Soat';

  const text =
    `📝 <b>Biodagi soat sozlamalari</b>\n\n` +
    `📊 Holat: <b>${status}</b>\n` +
    `🎨 Bio tipi: <b>${bioTypeName}</b>\n\n` +
    `ℹ️ Biodagi soat funksiyasi <b>Plus ✨</b> va <b>Premium ⭐️</b> tariflarida mavjud.`;

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...bioSettingsKeyboard(user) });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...bioSettingsKeyboard(user) });
  }
}

async function handleBioToggle(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  if (!user.clockInstalled) {
    return ctx.answerCbQuery('❌ Avval soatni o\'rnating!', { show_alert: true });
  }
  if (user.tariff !== 'plus' && user.tariff !== 'premium') {
    return ctx.answerCbQuery('❌ Bu funksiya faqat Plus va Premium tariflarida mavjud!', { show_alert: true });
  }

  const newState = !user.bioClockOn;
  Users.save(userId, { bioClockOn: newState });
  await ctx.answerCbQuery(newState ? '✅ Bio soat yoqildi' : '🔴 Bio soat o\'chirildi');
  await handleBioSettings(ctx);
}

async function handleBioType(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  if (user.tariff !== 'plus' && user.tariff !== 'premium') {
    return ctx.answerCbQuery('❌ Bu funksiya faqat Plus va Premium tariflarida mavjud!', { show_alert: true });
  }
  await ctx.answerCbQuery();

  const text = '🎨 <b>Bio turini tanlang:</b>';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...bioTypeKeyboard() });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...bioTypeKeyboard() });
  }
}

async function handleBioTypeSelect(ctx, typeId) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  Users.save(userId, { bioType: typeId });
  await ctx.answerCbQuery(`✅ Bio turi tanlandi: ${BIO_TYPES[typeId]?.name}`, { show_alert: true });
  await handleBioSettings(ctx);
}

async function handleSettingsTariff(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  const tariff = Tariffs.get(user.tariff);
  const text =
    `📋 <b>Sizning tarifingiz:</b>\n\n` +
    `Tarif: <b>${tariff?.name || 'Free'}</b>\n` +
    `Narxi: <b>${(tariff?.price || 0).toLocaleString()} so'm/oy</b>\n\n` +
    `${tariff?.description || ''}`;

  const { Markup } = require('telegraf');
  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'menu_settings')]]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

module.exports = {
  handleSettings,
  handleGeneralSettings,
  handleOnlineToggle,
  handleTimezoneMenu,
  handleTimezoneSelect,
  handleNickSettings,
  handleNickToggle,
  handleNickFont,
  handleFontSelect,
  handleBioSettings,
  handleBioToggle,
  handleBioType,
  handleBioTypeSelect,
  handleSettingsTariff,
};
