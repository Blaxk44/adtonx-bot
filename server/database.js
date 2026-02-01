// Simple in-memory database for testing
// Replace with Firebase when ready

class Database {
    constructor() {
        this.users = new Map();
        this.transactions = [];
        this.tasks = [];
        this.ads = [];
        this.settings = {
            withdrawal_fee: 0.20,
            min_withdrawal: 2,
            min_deposit: 10,
            admin_password: 'Asdfghjkl@123',
            admin_username: 'TRILLIONAIRE'
        };
        
        // Initialize with sample data
        this.initializeSampleData();
    }

    initializeSampleData() {
        // Sample admin user
        this.users.set('admin', {
            id: 'admin',
            username: 'TRILLIONAIRE',
            first_name: 'Admin',
            last_name: 'User',
            balance: 1000,
            total_earned: 0,
            status: 'active',
            is_admin: true,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        });

        // Sample tasks
        this.tasks = [
            {
                id: 'task1',
                title: 'Join Telegram Channel',
                description: 'Join our official Telegram channel',
                type: 'official',
                reward: 0.1,
                url: 'https://t.me/adtonx',
                clicks_required: 100,
                clicks_done: 25,
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: 'task2',
                title: 'Follow on Twitter',
                description: 'Follow us on Twitter',
                type: 'official',
                reward: 0.05,
                url: 'https://twitter.com/adtonx',
                clicks_required: 50,
                clicks_done: 10,
                status: 'active',
                created_at: new Date().toISOString()
            }
        ];

        // Sample ads
        this.ads = [
            {
                network: 'monetag',
                name: 'Monetag Ads',
                script: "show_10551237().then(() => { alert('You have seen an ad!'); })",
                reward: 0.005,
                status: 'active'
            },
            {
                network: 'adexium',
                name: 'Adexium Ads',
                script: `<script type="text/javascript" src="https://cdn.tgads.space/assets/js/adexium-widget.min.js"></script>
<script type="text/javascript">
    document.addEventListener('DOMContentLoaded', () => {
        const adexiumWidget = new AdexiumWidget({wid: '593e85f5-6028-4ee2-bf80-f7729b16a482', adFormat: 'interstitial'});
        adexiumWidget.autoMode();
    });
</script>`,
                reward: 0.008,
                status: 'active'
            },
            {
                network: 'adsgram',
                name: 'AdsGram Ads',
                script: `<iframe src="https://otieu.com/4/10551270" width="100%" height="100%"></iframe>`,
                reward: 0.006,
                status: 'active'
            }
        ];
    }

    // User methods
    async getUser(userId) {
        return this.users.get(userId);
    }

    async createUser(userData) {
        const user = {
            id: userData.id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            balance: 0,
            total_earned: 0,
            today_earnings: 0,
            ads_watched: 0,
            tasks_completed: 0,
            referral_count: 0,
            referral_earnings: 0,
            wallet_address: null,
            status: 'active',
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        };
        this.users.set(userData.id, user);
        return user;
    }

    async updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (user) {
            Object.assign(user, updates);
            user.last_active = new Date().toISOString();
            return user;
        }
        return null;
    }

    // Transaction methods
    async createTransaction(txData) {
        const tx = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...txData,
            timestamp: new Date().toISOString()
        };
        this.transactions.push(tx);
        return tx;
    }

    async getTransactionsByUser(userId, limit = 50) {
        return this.transactions
            .filter(tx => tx.user_id === userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    // Task methods
    async getTasks(filter = {}) {
        let tasks = this.tasks;
        
        if (filter.type) {
            tasks = tasks.filter(t => t.type === filter.type);
        }
        
        if (filter.status) {
            tasks = tasks.filter(t => t.status === filter.status);
        }
        
        return tasks;
    }

    async updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
            return this.tasks[taskIndex];
        }
        return null;
    }

    // Admin methods
    async getAllUsers() {
        return Array.from(this.users.values()).filter(u => !u.is_admin);
    }

    async getDashboardStats() {
        const allUsers = Array.from(this.users.values()).filter(u => !u.is_admin);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsers = allUsers.filter(u => 
            new Date(u.created_at) >= today
        ).length;
        
        const activeUsers = allUsers.filter(u => 
            new Date(u.last_active) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        
        const totalRevenue = allUsers.reduce((sum, user) => sum + user.total_earned, 0);
        const platformBalance = 1000; // Starting balance
        
        return {
            totalUsers: allUsers.length,
            activeUsers,
            newUsersToday: todayUsers,
            totalRevenue,
            platformBalance,
            pendingWithdrawals: 0,
            totalTasks: this.tasks.length,
            avgEarnings: allUsers.length > 0 ? totalRevenue / allUsers.length : 0,
            referralRate: 15.5,
            userChange: 2.5
        };
    }

    // Authentication
    async authenticateAdmin(username, password) {
        return username === this.settings.admin_username && 
               password === this.settings.admin_password;
    }
}

// Export singleton instance
const db = new Database();
module.exports = db;