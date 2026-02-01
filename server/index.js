require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// Check required environment variables
const requiredEnvVars = ['BOT_TOKEN', 'FIREBASE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
}

console.log('✅ Environment loaded successfully');
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? '✓ Set' : '✗ Missing');
console.log('PORT:', process.env.PORT);
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('Welcome to AdTONX!', {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '🚀 Open Mini App',
                    web_app: { url: process.env.WEBAPP_URL || 'http://localhost:3000/webapp' }
                }
            ]]
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        bot: process.env.BOT_TOKEN ? 'Connected' : 'Not connected'
    });
});

// Start bot
bot.launch().then(() => {
    console.log('🤖 Telegram bot started');
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 WebApp URL: ${process.env.WEBAPP_URL}`);
    console.log(`👑 Admin: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}`);
}); balance' });
        }
        
        // Calculate fees (20%)
        const fee = amount * 0.20;
        const netAmount = amount - fee;
        
        // Create withdrawal request
        const withdrawal = await db.createTransaction({
            user_id: userId,
            type: 'withdrawal_request',
            amount: -amount,
            fee: fee,
            net_amount: netAmount,
            wallet_address: walletAddress,
            status: 'pending'
        });
        
        // Update user balance
        await db.updateUser(userId, {
            balance: user.balance - amount
        });
        
        res.json({
            success: true,
            withdrawalId: withdrawal.id,
            amount,
            fee,
            netAmount,
            status: 'pending',
            message: 'Withdrawal request submitted'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin endpoints
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const isValid = await db.authenticateAdmin(username, password);
        
        if (isValid) {
            // Create simple token
            const token = crypto.randomBytes(32).toString('hex');
            res.json({
                success: true,
                token,
                user: {
                    username: 'TRILLIONAIRE',
                    role: 'admin'
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected admin endpoints
function authenticateAdminToken(req, res, next) {
    const token = req.headers['authorization'];
    // For testing, accept any token
    // In production, validate the token
    next();
}

app.get('/api/admin/dashboard', authenticateAdminToken, async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        
        // Mock data for charts
        const userGrowth = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            newUsers: [15, 20, 25, 30, 28, 35, 40],
            activeUsers: [100, 110, 120, 130, 125, 140, 150]
        };
        
        const distribution = {
            active: 65,
            inactive: 20,
            newToday: 10,
            banned: 5
        };
        
        const revenueSources = {
            adRevenue: 45,
            taskFees: 30,
            withdrawalFees: 20,
            premium: 5
        };
        
        const dailyActivity = {
            ads: [50, 75, 100, 150, 125, 100, 75],
            tasks: [20, 30, 40, 50, 45, 35, 25]
        };
        
        const recentActivity = [
            { time: '10:30', user: 'user1', action: 'Withdrawal Request', amount: '2.5 TON', status: 'pending' },
            { time: '10:25', user: 'user2', action: 'Task Completed', amount: '0.05 TON', status: 'completed' },
            { time: '10:20', user: 'user3', action: 'Ad Watched', amount: '0.008 TON', status: 'completed' }
        ];
        
        res.json({
            ...stats,
            userGrowth,
            distribution,
            revenueSources,
            dailyActivity,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', authenticateAdminToken, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({
            users,
            total: users.length,
            activeCount: users.filter(u => u.status === 'active').length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin/panel.html');
});

// Serve webapp
app.get('/webapp', (req, res) => {
    res.sendFile(__dirname + '/webapp/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`📱 WebApp: http://localhost:${PORT}/webapp`);
    console.log(`👑 Admin login: TRILLIONAIRE / Asdfghjkl@123`);

});

