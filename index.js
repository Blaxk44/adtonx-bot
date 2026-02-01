const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Use the simple database
const db = require('./database');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('webapp')); // Serve webapp files

// Simple Telegram validation (for testing)
function validateTelegramData(req, res, next) {
    // For testing, accept any request
    // In production, implement proper Telegram validation
    next();
}

// Public endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User endpoints
app.post('/api/user', validateTelegramData, async (req, res) => {
    try {
        const { userId, username, first_name, last_name } = req.body;
        
        let user = await db.getUser(userId);
        if (!user) {
            user = await db.createUser({
                id: userId,
                username,
                first_name,
                last_name
            });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Earn from ads
app.post('/api/earn/ad', validateTelegramData, async (req, res) => {
    try {
        const { userId, adNetwork } = req.body;
        const user = await db.getUser(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get ad reward
        const ad = db.ads.find(a => a.network === adNetwork);
        if (!ad) {
            return res.status(400).json({ error: 'Ad network not found' });
        }
        
        // Calculate reward
        const baseReward = ad.reward;
        
        // Tier-based rewards
        let tierBonus = 0;
        if (user.ads_watched >= 400 && user.ads_watched < 1000) {
            tierBonus = 0.045; // 0.05 total
        } else if (user.ads_watched >= 1000) {
            tierBonus = 0.075; // 0.08 total
        }
        
        const totalReward = baseReward + tierBonus;
        
        // Update user
        await db.updateUser(userId, {
            balance: user.balance + totalReward,
            total_earned: user.total_earned + totalReward,
            today_earnings: (user.today_earnings || 0) + totalReward,
            ads_watched: (user.ads_watched || 0) + 1,
            last_active: new Date().toISOString()
        });
        
        // Record transaction
        await db.createTransaction({
            user_id: userId,
            type: 'ad_watched',
            amount: totalReward,
            network: adNetwork,
            status: 'completed'
        });
        
        res.json({
            success: true,
            reward: totalReward,
            newBalance: user.balance + totalReward,
            adsWatched: (user.ads_watched || 0) + 1,
            message: `Earned ${totalReward} TON from watching ad`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tasks endpoints
app.get('/api/tasks', validateTelegramData, async (req, res) => {
    try {
        const tasks = await db.getTasks({ status: 'active' });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/complete', validateTelegramData, async (req, res) => {
    try {
        const { userId, taskId } = req.body;
        const user = await db.getUser(userId);
        const task = (await db.getTasks()).find(t => t.id === taskId);
        
        if (!user || !task) {
            return res.status(404).json({ error: 'User or task not found' });
        }
        
        // Check if already completed
        if (task.completed_by && task.completed_by.includes(userId)) {
            return res.status(400).json({ error: 'Task already completed' });
        }
        
        // Update task
        const clicks_done = (task.clicks_done || 0) + 1;
        const completed_by = task.completed_by || [];
        completed_by.push(userId);
        
        await db.updateTask(taskId, {
            clicks_done,
            completed_by,
            status: clicks_done >= task.clicks_required ? 'completed' : 'active'
        });
        
        // Update user
        await db.updateUser(userId, {
            balance: user.balance + task.reward,
            total_earned: user.total_earned + task.reward,
            tasks_completed: (user.tasks_completed || 0) + 1,
            last_active: new Date().toISOString()
        });
        
        // Record transaction
        await db.createTransaction({
            user_id: userId,
            type: 'task_completed',
            amount: task.reward,
            task_id: taskId,
            status: 'completed'
        });
        
        res.json({
            success: true,
            reward: task.reward,
            newBalance: user.balance + task.reward,
            taskProgress: `${clicks_done}/${task.clicks_required}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Withdrawal endpoints
app.post('/api/withdraw', validateTelegramData, async (req, res) => {
    try {
        const { userId, amount, walletAddress } = req.body;
        const user = await db.getUser(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (amount < 2) {
            return res.status(400).json({ error: 'Minimum withdrawal is 2 TON' });
        }
        
        if (amount > user.balance) {
            return res.status(400).json({ error: 'Insufficient balance' });
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