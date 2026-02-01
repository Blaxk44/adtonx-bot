const express = require('express');
const router = express.Router();
const { db, users, transactions, tasks, ads, settings, leaderboard } = require('./database');

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === process.env.ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Dashboard data
router.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const last28Days = new Date(today);
        last28Days.setDate(last28Days.getDate() - 28);

        // Get total users
        const totalUsersSnapshot = await users.count().get();
        const totalUsers = totalUsersSnapshot.data().count;

        // Get active users (active in last 24 hours)
        const activeUsersSnapshot = await users
            .where('last_active', '>=', yesterday)
            .count()
            .get();
        const activeUsers = activeUsersSnapshot.data().count;

        // Get today's new users
        const newUsersSnapshot = await users
            .where('created_at', '>=', today)
            .count()
            .get();
        const newUsersToday = newUsersSnapshot.data().count;

        // Get revenue data
        const transactionsSnapshot = await transactions
            .where('type', 'in', ['ad_revenue', 'task_fee', 'withdrawal_fee'])
            .where('timestamp', '>=', today)
            .get();
        
        let todayRevenue = 0;
        transactionsSnapshot.forEach(doc => {
            const tx = doc.data();
            if (tx.type === 'ad_revenue' || tx.type === 'task_fee') {
                todayRevenue += tx.amount;
            }
            if (tx.type === 'withdrawal_fee') {
                todayRevenue += tx.fee || 0;
            }
        });

        // Get user growth data for last 28 days
        const userGrowth = await getUserGrowthData(last28Days, today);

        // Get user distribution
        const distribution = await getUserDistribution(today);

        // Get revenue sources
        const revenueSources = await getRevenueSources(today);

        // Get daily activity
        const dailyActivity = await getDailyActivity(today);

        // Get recent activity
        const recentActivity = await getRecentActivity();

        // Get platform balance
        const platformBalance = await getPlatformBalance();

        res.json({
            totalUsers,
            activeUsers,
            newUsersToday,
            totalRevenue: todayRevenue,
            platformBalance,
            pendingWithdrawals: await getPendingWithdrawals(),
            totalTasks: await getTotalTasks(),
            avgEarnings: await getAverageEarnings(),
            referralRate: await getReferralRate(),
            userChange: calculatePercentageChange(totalUsers, await getYesterdayTotalUsers()),
            userGrowth,
            distribution,
            revenueSources,
            dailyActivity,
            recentActivity
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// User management endpoints
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const totalSnapshot = await users.count().get();
        const total = totalSnapshot.data().count;

        // Get active count
        const activeSnapshot = await users
            .where('status', '==', 'active')
            .count()
            .get();
        const activeCount = activeSnapshot.data().count;

        // Get users with pagination
        const usersSnapshot = await users
            .orderBy('created_at', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const userList = [];
        usersSnapshot.forEach(doc => {
            userList.push({ id: doc.id, ...doc.data() });
        });

        res.json({
            users: userList,
            total,
            activeCount,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Users error:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// Task management endpoints
router.get('/tasks', authenticateAdmin, async (req, res) => {
    try {
        const tasksSnapshot = await tasks
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        const taskList = [];
        tasksSnapshot.forEach(doc => {
            taskList.push({ id: doc.id, ...doc.data() });
        });

        res.json({ tasks: taskList });
    } catch (error) {
        console.error('Tasks error:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

// Deposit management endpoints
router.get('/deposits', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status || 'all';

        let query = transactions.where('type', '==', 'deposit');

        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        // Get total count
        const totalSnapshot = await query.count().get();
        const total = totalSnapshot.data().count;

        // Get deposits with pagination
        const depositsSnapshot = await query
            .orderBy('timestamp', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const depositList = [];
        depositsSnapshot.forEach(doc => {
            depositList.push({ id: doc.id, ...doc.data() });
        });

        res.json({
            deposits: depositList,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Deposits error:', error);
        res.status(500).json({ error: 'Failed to load deposits' });
    }
});

// Withdrawal management endpoints
router.get('/withdrawals', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status || 'all';

        let query = transactions.where('type', '==', 'withdrawal');

        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        // Get total count
        const totalSnapshot = await query.count().get();
        const total = totalSnapshot.data().count;

        // Get withdrawals with pagination
        const withdrawalsSnapshot = await query
            .orderBy('timestamp', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const withdrawalList = [];
        withdrawalsSnapshot.forEach(doc => {
            withdrawalList.push({ id: doc.id, ...doc.data() });
        });

        // Get summary data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayWithdrawalsSnapshot = await transactions
            .where('type', '==', 'withdrawal')
            .where('status', '==', 'completed')
            .where('timestamp', '>=', today)
            .get();

        let todayWithdrawals = 0;
        let todayCount = 0;
        todayWithdrawalsSnapshot.forEach(doc => {
            const tx = doc.data();
            todayWithdrawals += tx.amount;
            todayCount++;
        });

        const pendingWithdrawalsSnapshot = await transactions
            .where('type', '==', 'withdrawal')
            .where('status', '==', 'pending')
            .get();

        let pendingTotal = 0;
        let pendingCount = 0;
        pendingWithdrawalsSnapshot.forEach(doc => {
            const tx = doc.data();
            pendingTotal += tx.amount;
            pendingCount++;
        });

        res.json({
            withdrawals: withdrawalList,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            summary: {
                todayWithdrawals,
                todayCount,
                pendingTotal,
                pendingCount,
                totalFees: await getTotalFeesToday(today),
                avgWithdrawal: todayCount > 0 ? todayWithdrawals / todayCount : 0
            }
        });
    } catch (error) {
        console.error('Withdrawals error:', error);
        res.status(500).json({ error: 'Failed to load withdrawals' });
    }
});

// Approve withdrawal
router.post('/withdrawals/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const withdrawalRef = transactions.doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();

        if (!withdrawalDoc.exists) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        const withdrawal = withdrawalDoc.data();

        // Update withdrawal status
        await withdrawalRef.update({
            status: 'processing',
            approved_at: new Date().toISOString(),
            approved_by: 'admin'
        });

        // Update user balance
        const userRef = users.doc(withdrawal.user_id);
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(-withdrawal.amount)
        });

        // Create transaction record
        await transactions.add({
            user_id: withdrawal.user_id,
            type: 'withdrawal_processed',
            amount: -withdrawal.net_amount,
            fee: withdrawal.fee,
            status: 'completed',
            timestamp: new Date().toISOString(),
            description: 'Withdrawal processed to wallet: ' + withdrawal.wallet_address
        });

        res.json({ success: true, message: 'Withdrawal approved' });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
});

// Reject withdrawal
router.post('/withdrawals/:id/reject', authenticateAdmin, async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const { reason } = req.body;

        const withdrawalRef = transactions.doc(withdrawalId);
        await withdrawalRef.update({
            status: 'failed',
            rejected_at: new Date().toISOString(),
            rejected_by: 'admin',
            rejection_reason: reason
        });

        res.json({ success: true, message: 'Withdrawal rejected' });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
});

// Verify deposit manually
router.post('/verify-deposit', authenticateAdmin, async (req, res) => {
    try {
        const { deposit_id } = req.body;
        
        // This would typically verify against TON blockchain
        // For now, we'll simulate verification
        
        const depositRef = transactions.doc(deposit_id);
        const depositDoc = await depositRef.get();
        
        if (!depositDoc.exists) {
            return res.status(404).json({ error: 'Deposit not found' });
        }
        
        const deposit = depositDoc.data();
        
        if (deposit.status === 'confirmed') {
            return res.json({ success: true, message: 'Deposit already confirmed' });
        }
        
        // Update deposit status
        await depositRef.update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_by: 'admin_manual'
        });
        
        // Update user balance
        const userRef = users.doc(deposit.user_id);
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(deposit.amount)
        });
        
        res.json({ success: true, message: 'Deposit verified and user balance updated' });
    } catch (error) {
        console.error('Verify deposit error:', error);
        res.status(500).json({ error: 'Failed to verify deposit' });
    }
});

// Create task
router.post('/tasks', authenticateAdmin, async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            created_by: 'admin',
            created_at: new Date().toISOString(),
            status: 'active',
            clicks_done: 0,
            participants: []
        };

        const taskRef = await tasks.add(taskData);
        
        res.json({ 
            success: true, 
            message: 'Task created successfully',
            taskId: taskRef.id 
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Helper functions
async function getUserGrowthData(startDate, endDate) {
    const labels = [];
    const newUsersData = [];
    const activeUsersData = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Get new users for this day
        const newUsersSnapshot = await users
            .where('created_at', '>=', dayStart)
            .where('created_at', '<=', dayEnd)
            .count()
            .get();
        newUsersData.push(newUsersSnapshot.data().count);

        // Get active users for this day
        const activeUsersSnapshot = await users
            .where('last_active', '>=', dayStart)
            .where('last_active', '<=', dayEnd)
            .count()
            .get();
        activeUsersData.push(activeUsersSnapshot.data().count);
    }

    return { labels, newUsers: newUsersData, activeUsers: activeUsersData };
}

async function getUserDistribution(today) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

    // Active users (active in last 24 hours)
    const activeSnapshot = await users
        .where('last_active', '>=', yesterday)
        .count()
        .get();
    const active = activeSnapshot.data().count;

    // Inactive users (not active in last 24 hours but in last 7 days)
    const inactiveSnapshot = await users
        .where('last_active', '>=', dayBeforeYesterday)
        .where('last_active', '<', yesterday)
        .count()
        .get();
    const inactive = inactiveSnapshot.data().count;

    // New today
    const newTodaySnapshot = await users
        .where('created_at', '>=', today)
        .count()
        .get();
    const newToday = newTodaySnapshot.data().count;

    // Banned users
    const bannedSnapshot = await users
        .where('status', '==', 'banned')
        .count()
        .get();
    const banned = bannedSnapshot.data().count;

    return { active, inactive, newToday, banned };
}

async function getRevenueSources(today) {
    // Get revenue from different sources for today
    const adRevenueSnapshot = await transactions
        .where('type', '==', 'ad_revenue')
        .where('timestamp', '>=', today)
        .get();

    let adRevenue = 0;
    adRevenueSnapshot.forEach(doc => {
        adRevenue += doc.data().amount;
    });

    const taskFeeSnapshot = await transactions
        .where('type', '==', 'task_fee')
        .where('timestamp', '>=', today)
        .get();

    let taskFees = 0;
    taskFeeSnapshot.forEach(doc => {
        taskFees += doc.data().amount;
    });

    const withdrawalFeeSnapshot = await transactions
        .where('type', '==', 'withdrawal_fee')
        .where('timestamp', '>=', today)
        .get();

    let withdrawalFees = 0;
    withdrawalFeeSnapshot.forEach(doc => {
        withdrawalFees += doc.data().fee || 0;
    });

    const premiumSnapshot = await transactions
        .where('type', '==', 'premium_purchase')
        .where('timestamp', '>=', today)
        .get();

    let premium = 0;
    premiumSnapshot.forEach(doc => {
        premium += doc.data().amount;
    });

    const total = adRevenue + taskFees + withdrawalFees + premium;

    // Convert to percentages
    return {
        adRevenue: total > 0 ? (adRevenue / total) * 100 : 0,
        taskFees: total > 0 ? (taskFees / total) * 100 : 0,
        withdrawalFees: total > 0 ? (withdrawalFees / total) * 100 : 0,
        premium: total > 0 ? (premium / total) * 100 : 0
    };
}

async function getDailyActivity(today) {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    const adsData = [];
    const tasksData = [];

    for (let i = 0; i < hours.length; i++) {
        const hour = parseInt(hours[i].split(':')[0]);
        const hourStart = new Date(today);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 4, 59, 59, 999);

        // Get ads watched in this period
        const adsSnapshot = await ads
            .where('timestamp', '>=', hourStart)
            .where('timestamp', '<=', hourEnd)
            .count()
            .get();
        adsData.push(adsSnapshot.data().count);

        // Get tasks completed in this period
        const tasksSnapshot = await transactions
            .where('type', '==', 'task_completed')
            .where('timestamp', '>=', hourStart)
            .where('timestamp', '<=', hourEnd)
            .count()
            .get();
        tasksData.push(tasksSnapshot.data().count);
    }

    return { ads: adsData, tasks: tasksData };
}

async function getRecentActivity() {
    const recentSnapshot = await transactions
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

    const activities = [];
    recentSnapshot.forEach(doc => {
        const tx = doc.data();
        activities.push({
            id: doc.id,
            time: new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            user: tx.user_id,
            action: getActionDescription(tx.type),
            amount: getAmountDescription(tx),
            status: tx.status
        });
    });

    return activities;
}

async function getPlatformBalance() {
    // This would typically be calculated from actual TON wallet balance
    // For now, we'll calculate from transactions
    const revenueSnapshot = await transactions
        .where('type', 'in', ['ad_revenue', 'task_fee', 'withdrawal_fee', 'premium_purchase'])
        .get();

    let totalRevenue = 0;
    revenueSnapshot.forEach(doc => {
        const tx = doc.data();
        if (tx.type === 'withdrawal_fee') {
            totalRevenue += tx.fee || 0;
        } else {
            totalRevenue += tx.amount;
        }
    });

    const payoutSnapshot = await transactions
        .where('type', 'in', ['ad_payout', 'task_payout', 'referral_payout'])
        .get();

    let totalPayouts = 0;
    payoutSnapshot.forEach(doc => {
        totalPayouts += doc.data().amount;
    });

    return totalRevenue - totalPayouts;
}

function getActionDescription(type) {
    const descriptions = {
        'ad_watched': 'Ad Watched',
        'task_completed': 'Task Completed',
        'deposit': 'Deposit',
        'withdrawal_request': 'Withdrawal Request',
        'withdrawal_completed': 'Withdrawal Completed',
        'referral_bonus': 'Referral Bonus',
        'ad_revenue': 'Ad Revenue',
        'task_fee': 'Task Fee',
        'withdrawal_fee': 'Withdrawal Fee'
    };
    return descriptions[type] || type;
}

function getAmountDescription(tx) {
    if (tx.type === 'withdrawal_fee') {
        return `${tx.fee || 0} TON`;
    }
    return `${Math.abs(tx.amount)} TON`;
}

async function getPendingWithdrawals() {
    const pendingSnapshot = await transactions
        .where('type', '==', 'withdrawal_request')
        .where('status', '==', 'pending')
        .get();

    let total = 0;
    pendingSnapshot.forEach(doc => {
        total += doc.data().amount;
    });

    return total;
}

async function getTotalTasks() {
    const snapshot = await tasks.count().get();
    return snapshot.data().count;
}

async function getAverageEarnings() {
    const usersSnapshot = await users.get();
    let totalEarned = 0;
    let userCount = 0;

    usersSnapshot.forEach(doc => {
        const user = doc.data();
        totalEarned += user.total_earned || 0;
        userCount++;
    });

    return userCount > 0 ? totalEarned / userCount : 0;
}

async function getReferralRate() {
    const usersSnapshot = await users.get();
    let totalUsers = 0;
    let usersWithReferrals = 0;

    usersSnapshot.forEach(doc => {
        const user = doc.data();
        totalUsers++;
        if (user.referred_by) {
            usersWithReferrals++;
        }
    });

    return totalUsers > 0 ? (usersWithReferrals / totalUsers) * 100 : 0;
}

async function getYesterdayTotalUsers() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const snapshot = await users
        .where('created_at', '<', yesterday)
        .count()
        .get();

    return snapshot.data().count;
}

function calculatePercentageChange(current, previous) {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
}

async function getTotalFeesToday(today) {
    const snapshot = await transactions
        .where('type', '==', 'withdrawal_fee')
        .where('timestamp', '>=', today)
        .get();

    let totalFees = 0;
    snapshot.forEach(doc => {
        totalFees += doc.data().fee || 0;
    });

    return totalFees;
}

module.exports = router;