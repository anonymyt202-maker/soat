const { Users } = require('../database/db');
const { checkSubscriptions } = require('../services/subscription');
const { subscribeChannelKeyboard, installMenuKeyboard, requestPhoneKeyboard, removeKeyboard, cancelKeyboard, mainMenuKeyboard } = require('../utils/keyboards');
const { sendCode, signIn, signInWith2FA, cleanupPending } = require('../services/mtproto');
const { installClockForUser } = require('../services/clockService');

async function handleInstallMenu(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');

  const sub = await checkSubscriptions(ctx);
  if (!sub.ok) {
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      '📢 Botdan foydalanish uchun quyidagi kanallarga obuna bo\'ling:',
      subscribeChannelKeyboard(sub.channels)
    );
  }

  await ctx.answerCbQuery();

  const text =
    `🕒 <b>Soat o'rnatish qo'llanmasi va foydalanish shartlari</b>\n\n` +
    `📌 <b>Shartlar</b>\n\n` +
    `Agar siz tekin tarifdan foydalanayotgan bo\'lsangiz, bot avtomatik ravishda profil bioingizga reklama qo\'shadi. ` +
    `Agar reklamasiz soat qo\'yishni xohlasangiz, pullik tariflardan birini tanlashingiz kerak. ` +
    `Batafsil ma\'lumotni <b>Tariflar</b> bo\'limidan olishingiz mumkin.\n\n` +
    `📖 <b>O'rnatish qo'llanmasi</b>\n\n` +
    `📞 Telefon raqamni yuborish tugmasini bosing va raqamingizni botga yuboring.\n` +
    `Sizning Telegram akkauntingizga 5 xonali kod keladi. Uni botga nuqtalar bilan yuborishingiz kerak:\n` +
    `   - Masalan: agar kod <code>12345</code> bo\'lsa → <code>12.345</code> yoki <code>123.45</code>.\n` +
    `   - ⚠️ Sabab: kodni oddiy holatda yuborsangiz, u darhol yaroqsiz bo\'lib qoladi.\n` +
    `Agar akkauntingizda 2 bosqichli parol yoqilgan bo\'lsa, uni ham botga yuboring.\n` +
    `Shundan so\'ng, 1 daqiqa ichida profilingizda avtomatik soat paydo bo\'ladi.\n\n` +
    `⚙️ <b>Qanday ishlaydi?</b>\n\n` +
    `Bot har daqiqada sizning profil familiyangizni (Last name) joriy vaqt bilan yangilab turadi.\n\n` +
    `🔒 <b>Xavfsizlik</b>\n\n` +
    `Sizning akkauntingiz 100% xavfsiz. Telefon raqam, kod va parollar faqat qayta ishlash va ` +
    `bot orqali soat o\'rnatish uchun ishlatiladi. Hech qanday ma\'lumotlar uchinchi shaxslarga berilmaydi.`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...installMenuKeyboard() });
}

async function handleInstallAccept(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');

  await ctx.answerCbQuery();
  Users.save(userId, { state: 'awaiting_phone', stateData: {} });

  await ctx.reply(
    '📞 <b>Telefon raqamingizni jo\'nating:</b>\n\n' +
    '⬇️ Quyidagi tugmani bosib raqamingizni yuboring yoki bekor qiling.',
    { parse_mode: 'HTML', ...requestPhoneKeyboard() }
  );
}

async function handlePhoneContact(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.state !== 'awaiting_phone') return;

  const phone = ctx.message.contact?.phone_number;
  if (!phone) return;

  if (String(ctx.message.contact.user_id) !== String(userId)) {
    return ctx.reply('❌ Faqat o\'z raqamingizni yuboring!', removeKeyboard());
  }

  const loadingMsg = await ctx.reply('⏳ Kod yuborilmoqda...', removeKeyboard());

  const result = await sendCode(userId, phone);

  if (!result.success) {
    Users.save(userId, { state: null, stateData: {} });
    return ctx.reply(`❌ Xatolik: ${result.error}\n\nQaytadan urinib ko\'ring.`, mainMenuKeyboard());
  }

  Users.save(userId, { state: 'awaiting_code', stateData: { phone } });

  try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (e) {}

  await ctx.reply(
    '🚀\n\n' +
    '📱 Telegramga 5 xonali tasdiqlash kodi yuborildi.\n\n' +
    `Masalan: agar kod <code>12345</code> bo\'lsa → <code>12.345</code> yoki <code>123.45</code>\n\n` +
    '⬇️ <b>Kodni nuqtalar bilan ajratib kiriting:</b>',
    { parse_mode: 'HTML', ...cancelKeyboard('back_main') }
  );
}

async function handleTextCancelInstall(ctx) {
  const userId = ctx.from.id;
  await cleanupPending(userId);
  Users.save(userId, { state: null, stateData: {} });
  await ctx.reply('❌ Bekor qilindi.', removeKeyboard());
  const { mainMenuKeyboard: mk } = require('../utils/keyboards');
  await ctx.reply(
    `Assalomu aleykum <b>${ctx.from.first_name}</b> ! 👋\n\nAsosiy menyu:`,
    { parse_mode: 'HTML', ...mainMenuKeyboard() }
  );
}

async function handleCodeInput(ctx, code) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.state !== 'awaiting_code') return false;

  const cleanCode = code.replace(/\./g, '').replace(/\s/g, '');
  if (!/^\d{5}$/.test(cleanCode)) {
    await ctx.reply(
      '❌ Noto\'g\'ri format! Kodni nuqta bilan ajratib yuboring.\n' +
      'Masalan: <code>12.345</code> yoki <code>123.45</code>',
      { parse_mode: 'HTML', ...cancelKeyboard('back_main') }
    );
    return true;
  }

  const result = await signIn(userId, cleanCode);

  if (result.need2FA) {
    Users.save(userId, { state: 'awaiting_2fa', stateData: { ...user.stateData } });
    await ctx.reply(
      '🔐 <b>Telegram 2 bosqichli parolingizni kiriting (2FA):</b>',
      { parse_mode: 'HTML', ...cancelKeyboard('back_main') }
    );
    return true;
  }

  if (!result.success) {
    if (result.needRestart) {
      Users.save(userId, { state: null, stateData: {} });
      await ctx.reply(`❌ ${result.error}\n\nQaytadan boshlang.`, removeKeyboard());
      await ctx.reply('Asosiy menyu:', mainMenuKeyboard());
      return true;
    }
    await ctx.reply(`❌ ${result.error}`, cancelKeyboard('back_main'));
    return true;
  }

  await finishInstall(ctx, userId);
  return true;
}

async function handle2FAInput(ctx, password) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.state !== 'awaiting_2fa') return false;

  const result = await signInWith2FA(userId, password);

  if (!result.success) {
    if (result.needRestart) {
      Users.save(userId, { state: null, stateData: {} });
      await ctx.reply(`❌ ${result.error}\n\nQaytadan boshlang.`, removeKeyboard());
      await ctx.reply('Asosiy menyu:', mainMenuKeyboard());
      return true;
    }
    await ctx.reply(`❌ ${result.error}\n\nQaytadan kiriting:`, cancelKeyboard('back_main'));
    return true;
  }

  await finishInstall(ctx, userId);
  return true;
}

async function finishInstall(ctx, userId) {
  Users.save(userId, { state: null, stateData: {} });

  await ctx.reply('⏳ Soat o\'rnatilmoqda...', removeKeyboard());

  const success = await installClockForUser(userId);

  if (success) {
    await ctx.reply(
      '✅ <b>Soat muvaffaqiyatli o\'rnatildi!</b>\n\n' +
      '🕒 1 daqiqa ichida profilingizda soat paydo bo\'ladi.\n\n' +
      '⚙️ Soat sozlamalari uchun <b>Soat Sozlamalari</b> bo\'limiga o\'ting.',
      { parse_mode: 'HTML', ...mainMenuKeyboard() }
    );
  } else {
    await ctx.reply(
      '❌ Soat o\'rnatishda xatolik yuz berdi. Qaytadan urinib ko\'ring.',
      mainMenuKeyboard()
    );
  }
}

module.exports = {
  handleInstallMenu,
  handleInstallAccept,
  handlePhoneContact,
  handleTextCancelInstall,
  handleCodeInput,
  handle2FAInput,
};
