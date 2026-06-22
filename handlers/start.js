const { Users } = require('../database/db');
const { mainMenuKeyboard } = require('../utils/keyboards');
const { checkSubscriptions } = require('../services/subscription');
const { subscribeChannelKeyboard } = require('../utils/keyboards');
const config = require('../config');

async function handleStart(ctx) {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Foydalanuvchi';

  let user = Users.get(userId);
  if (!user) {
    user = Users.create(userId, ctx);
    const pad = n => String(n).padStart(2, '0');
    const now = new Date(Date.now() + 5 * 3600000);
    const joinDate = `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
    for (const adminId of config.admins) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          `👤 <b>Yangi foydalanuvchi!</b>\n\n` +
          `ID: <code>${userId}</code>\n` +
          `Username: ${ctx.from.username ? '@' + ctx.from.username : 'Yo\'q'}\n` +
          `Ismi: <b>${ctx.from.first_name || ''}</b>\n` +
          `Botga qo'shilgan: <b>${joinDate} (UTC+5)</b>`,
          { parse_mode: 'HTML' }
        );
      } catch {}
    }
  } else {
    Users.save(userId, {
      username: ctx.from.username || user.username,
      firstName: ctx.from.first_name || user.firstName,
    });
  }

  if (user.banned) {
    return ctx.reply('🚫 Siz botdan foydalanish huquqidan mahrum etildingiz.');
  }

  const sub = await checkSubscriptions(ctx);
  if (!sub.ok) {
    return ctx.reply(
      '📢 Botdan foydalanish uchun quyidagi kanallarga obuna bo\'ling:',
      subscribeChannelKeyboard(sub.channels)
    );
  }

  Users.save(userId, { state: null, stateData: {} });

  const text =
    `Assalomu aleykum <b>${firstName}</b> ! 👋\n\n` +
    `📋 O'zingizga kerakli tugmani bosish orqali menuni chiqarishingiz mumkin.\n\n` +
    `🤖 Men boshqalardan ajralib turishi uchun hizmat ko'rsatadigan botman.\n\n` +
    `🕒 Profilingizga soat qo'yishni istasangiz <b>"Soat O'rnatish 🕒"</b> bo'limidan foydalanishingiz mumkin.\n\n` +
    `❓ Savollaringiz bormi? Hammasi joyida! <b>"Savollar (FAQ) ❓"</b> tugmasini bosing va biz imkon qadar tezroq javob berishga harakat qilamiz.\n\n` +
    `🤝 Shunday botga buyurtma berishni xohlaysizmi? Unda dasturchi bilan bog'lanishingiz mumkin.`;

  await ctx.replyWithHTML(text, mainMenuKeyboard());
}

async function handleCheckSubscription(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return handleStart(ctx);

  if (user.banned) {
    return ctx.answerCbQuery('🚫 Siz ban qilindingiz');
  }

  const sub = await checkSubscriptions(ctx);
  if (!sub.ok) {
    return ctx.answerCbQuery('❌ Hali obuna bo\'lmadingiz!', { show_alert: true });
  }

  await ctx.answerCbQuery('✅ Obuna tasdiqlandi!');
  await handleStart(ctx);
}

module.exports = { handleStart, handleCheckSubscription };
