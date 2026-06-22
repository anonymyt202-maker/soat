const { Users, Payments, Cards } = require('../database/db');
const { topupKeyboard, cancelKeyboard, mainMenuKeyboard } = require('../utils/keyboards');
const { formatNumber } = require('../utils/helpers');
const config = require('../config');
const { Markup } = require('telegraf');

async function handleTopup(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');
  await ctx.answerCbQuery();

  const text =
    `💰 <b>Hisobni to'ldirish</b>\n\n` +
    `Hozirda sizning balansingizda <b>${formatNumber(user.balance || 0)} so'm</b> pul bor.\n\n` +
    `O'zingizga kerakli to'lov turini tanlang:`;

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...topupKeyboard() });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...topupKeyboard() });
  }
}

async function handleTopupCard(ctx, type) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');

  const cards = Cards.getByType(type);
  if (!cards || cards.length === 0) {
    return ctx.answerCbQuery('❌ Bu to\'lov turi hozircha mavjud emas', { show_alert: true });
  }

  await ctx.answerCbQuery();

  const card = cards[0];
  const clean = String(card.number).replace(/\s/g, '');
  const formatted = clean.match(/.{1,4}/g)?.join(' ') || card.number;
  const label = type === 'humo' ? '🟩 Humo' : '🟦 Uzcard';

  const text =
    `${label} <b>to'lov</b>\n\n` +
    `Karta raqami: <code>${formatted}</code>\n` +
    `Egasi: <b>${card.owner || 'Admin'}</b>\n\n` +
    `To'lovni amalga oshirgandan so'ng chek rasmini botga jo'nating:`;

  Users.save(userId, { state: 'awaiting_payment_check', stateData: { cardType: type } });

  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_topup')]]);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handlePaymentCheck(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.state !== 'awaiting_payment_check') return false;

  const photo = ctx.message.photo;
  const doc = ctx.message.document;

  if (!photo && !doc) return false;

  const fileId = photo ? photo[photo.length - 1].file_id : doc.file_id;
  const cardType = user.stateData?.cardType || 'unknown';

  const payment = Payments.add({
    userId,
    cardType,
    fileId,
    status: 'pending',
    amount: null,
  });

  Users.save(userId, { state: null, stateData: {}, pendingPayment: payment.id });

  await ctx.reply(
    '✅ <b>To\'lov uchun katta rahmat!</b>\n\n' +
    'To\'lovni adminlar tasdiqlaydi va mablag\' hisobingizga tushuriladi. O\'shanda sizga xabar beramiz 😇',
    { parse_mode: 'HTML', ...mainMenuKeyboard() }
  );

  const { paymentConfirmKeyboard } = require('../utils/keyboards');
  const adminText =
    `💳 <b>Yangi to'lov so'rovi</b>\n\n` +
    `Foydalanuvchi: <a href="tg://user?id=${userId}">${user.firstName || userId}</a>\n` +
    `ID: <code>${userId}</code>\n` +
    `Username: ${user.username ? '@' + user.username : 'Yo\'q'}\n` +
    `To'lov turi: <b>${cardType}</b>\n` +
    `To'lov ID: <code>${payment.id}</code>`;

  for (const adminId of config.admins) {
    try {
      if (photo) {
        await ctx.telegram.sendPhoto(adminId, fileId, {
          caption: adminText,
          parse_mode: 'HTML',
          ...paymentConfirmKeyboard(payment.id),
        });
      } else {
        await ctx.telegram.sendDocument(adminId, fileId, {
          caption: adminText,
          parse_mode: 'HTML',
          ...paymentConfirmKeyboard(payment.id),
        });
      }
    } catch (e) {}
  }

  return true;
}

module.exports = { handleTopup, handleTopupCard, handlePaymentCheck };
