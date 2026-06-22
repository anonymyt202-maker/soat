const { Users, Tariffs } = require('../database/db');
const { tariffsKeyboard, mainMenuKeyboard } = require('../utils/keyboards');
const { formatNumber } = require('../utils/helpers');
const { Markup } = require('telegraf');

async function handleTariffs(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');
  await ctx.answerCbQuery();

  const tariffs = Tariffs.getAll();
  let text = '🛍 <b>Tariflar haqida ma\'lumot:</b>\n\n';

  for (const t of Object.values(tariffs)) {
    text += `📌 Tarif: <b>${t.name}</b>`;
    if (user.tariff === t.id) text += ' ✔️';
    text += `\n💰 Narxi: <b>${formatNumber(t.price)} so'm / oy</b>\n✨ Imkoniyatlar:\n\n${t.description}\n\n`;
  }

  text += '<i>Ko\'rsatilgan narxlar 1 oy uchun!</i>\n\nTariflardan birini tanlang:';

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...tariffsKeyboard() });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...tariffsKeyboard() });
  }
}

async function handleBuyTariff(ctx, tariffId) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();

  const tariff = Tariffs.get(tariffId);
  if (!tariff) return ctx.answerCbQuery('❌ Tarif topilmadi');

  if (user.tariff === tariffId) {
    return ctx.answerCbQuery('✅ Siz allaqachon bu tarifdasiz', { show_alert: true });
  }

  if (tariff.price === 0) {
    const now = new Date();
    Users.save(userId, {
      tariff: tariffId,
      tariffExpires: null,
    });
    await ctx.answerCbQuery(`✅ ${tariff.name} tarifiga o'tdingiz!`, { show_alert: true });
    return;
  }

  if ((user.balance || 0) < tariff.price) {
    return ctx.answerCbQuery('❌ Mablag\' yetarli emas, iltimos hisobingizni to\'ldiring!', { show_alert: true });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  Users.save(userId, {
    tariff: tariffId,
    tariffExpires: expires.toISOString(),
    balance: (user.balance || 0) - tariff.price,
  });

  await ctx.answerCbQuery(`✅ ${tariff.name} tarifi faollashtirildi!`, { show_alert: true });

  await ctx.reply(
    `🎉 <b>${tariff.name}</b> tarifi muvaffaqiyatli faollashtirildi!\n\n` +
    `💰 Hisobdan ayirildi: <b>${formatNumber(tariff.price)} so'm</b>\n` +
    `📅 Muddat: <b>30 kun</b>`,
    { parse_mode: 'HTML', ...mainMenuKeyboard() }
  );
}

module.exports = { handleTariffs, handleBuyTariff };
