const { Telegraf, session } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware
bot.use(session());

// Start command
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const referralCode = ctx.startPayload || null;
    
    // Check if referral
    if (referralCode && referralCode.startsWith('ref_')) {
        const referrerId = referralCode.split('_')[1];
        await handleReferral(userId, referrerId);
    }
    
    const welcomeMessage = `🎉 Welcome ${username} to AdTONX!\n\n` +
                          `💰 Watch Ads. Complete Tasks. Earn TON.\n\n` +
                          `📱 Click the button below to open the Mini App and start earning!`;
    
    await ctx.reply(welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Open AdTONX Mini App', web_app: { url: process.env.WEBAPP_URL } }],
                [{ text: '📊 My Stats', callback_data: 'stats' }],
                [{ text: '🤝 Refer & Earn', callback_data: 'referral' }]
            ]
        }
    });
});

// Handle referral logic
async function handleReferral(newUserId, referrerId) {
    // Save referral in database
    const referralData = {
        referrer: referrerId,
        referred: newUserId,
        timestamp: Date.now(),
        status: 'active'
    };
    // TODO: Save to database
}

// Bot commands
bot.command('balance', async (ctx) => {
    const balance = await getUserBalance(ctx.from.id);
    await ctx.reply(`💰 Your Balance: ${balance} TON\n\n` +
                   `💳 Minimum Withdrawal: 2 TON\n` +
                   `📊 Today's Earnings: 0.05 TON`);
});

bot.command('ref', async (ctx) => {
    const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;
    await ctx.reply(`🤝 Referral Program\n\n` +
                   `Earn 10% lifetime commission + 0.005 TON per active referral!\n\n` +
                   `Your referral link:\n` +
                   `<code>${refLink}</code>\n\n` +
                   `📊 Statistics:\n` +
                   `• Total Referrals: 0\n` +
                   `• Earned from Referrals: 0 TON`, 
                   { parse_mode: 'HTML' });
});

// Callback queries
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    switch(data) {
        case 'stats':
            const stats = await getUserStats(ctx.from.id);
            await ctx.editMessageText(`📊 Your Statistics\n\n` +
                                    `💰 Total Earned: ${stats.totalEarned} TON\n` +
                                    `📈 Today's Earnings: ${stats.todayEarnings} TON\n` +
                                    `👥 Referrals: ${stats.referrals}\n` +
                                    `✅ Tasks Completed: ${stats.tasksCompleted}`);
            break;
        case 'referral':
            const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;
            await ctx.editMessageText(`🎯 Refer & Earn\n\n` +
                                    `Share your link and earn:\n` +
                                    `• 10% of referral's lifetime earnings\n` +
                                    `• +0.005 TON per active referral\n\n` +
                                    `Your unique link:\n` +
                                    `<code>${refLink}</code>\n\n` +
                                    `📋 Rules:\n` +
                                    `1. Referral must watch at least 10 ads\n` +
                                    `2. Must be an active user for 3 days`, 
                                    { parse_mode: 'HTML' });
            break;
    }
    
    await ctx.answerCbQuery();
});

// Launch bot
bot.launch().then(() => {
    console.log('🤖 AdTONX Bot is running...');
});

// Database functions (placeholder)
async function getUserBalance(userId) {
    // TODO: Fetch from database
    return 0.5;
}

async function getUserStats(userId) {
    // TODO: Fetch from database
    return {
        totalEarned: 2.5,
        todayEarnings: 0.15,
        referrals: 3,
        tasksCompleted: 12
    };
}

process.once('SIGINT', () => bot.stop('SIGINT'));

process.once('SIGTERM', () => bot.stop('SIGTERM'));
