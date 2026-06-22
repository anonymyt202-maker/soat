const { Markup } = require('telegraf');
const config = require('../config');

async function handleFaq(ctx) {
  const userId = ctx.from?.id;
  if (ctx.callbackQuery) await ctx.answerCbQuery();

  const text =
    `❓ <b>Ko'p so'raladigan savollar:</b>\n\n` +

    `<b>1. Bot nima vazifani bajaradi?</b>\n` +
    `📲 <i>Javob:</i>\n` +
    `Botda turli funksiya va imkoniyatlar mavjud. Shulardan ba'zilari:\n\n` +
    `• Profil nicknamesiga har daqiqa o'zgarib turuvchi soat o'rnatish\n` +
    `• Bio yani tavsifga har daqiqa o'zgarib turuvchi soat o'rnatish\n` +
    `• Profilda 24/7 online rejimini yoqish\n` +
    `• Bioga turli bezakli matnlar yozish (tug'ilgan kun hisoblagichi, yangi yil hisoblagichi, vaqtga qarab salomlashish)\n\n` +

    `<b>2. Soatni qanday o'rnatsa bo'ladi?</b>\n` +
    `📲 <i>Javob:</i>\n` +
    `1. Botga /start bosing\n` +
    `2. <b>"Soat O'rnatish 🕒"</b> tugmasini bosing\n` +
    `3. <b>"O'qib Chiqdim ✅"</b> tugmasini bosing\n` +
    `4. <b>"📞 Telefon raqamni jo'natish"</b> tugmasini bosing\n` +
    `5. Telegramingizga borgan kodni nuqtalar bilan ajratib kiriting\n` +
    `5(2). Agar 2 bosqichli parol o'rnatilgan bo'lsa, uni kiriting\n` +
    `6. Tayyor! 1 daqiqa ichida profilingizda soat paydo bo'ladi ✅\n\n` +

    `<b>3. Bot xavfsizmi?</b>\n` +
    `📲 <i>Javob:</i>\n` +
    `Ha. Botda xavfsizlik 100% ta'minlangan.\n` +
    `Botda kod va 2 bosqichli parol so'rashi faqatgina soat o'rnatish maqsadida ishlatiladi.\n\n` +
    `🛡 Akkauntdan hech qanday ma'lumotlar o'qilmaydi, sizib chiqmaydi va saqlanmaydi. Bunga kafolat beriladi 🔐\n\n` +

    `<b>4. Soatni o'chirib qo'ysa bo'ladimi?</b>\n` +
    `📲 <i>Javob:</i>\n` +
    `Ha! <b>"Soat Sozlamalari ⚙️"</b> bo'limida soatni istalgan vaqtda yoqib-o'chirishingiz mumkin.\n\n` +

    `Agar boshqa savollaringiz bo'lsa, bizga yozishingiz mumkin.\n${config.dev.username}`;

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'back_main')]]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

module.exports = { handleFaq };
