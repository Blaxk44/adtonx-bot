class AdTONXApp {
    constructor() {
        this.user = null;
        this.tg = null;
        this.currentAd = null;
        this.adTimer = null;
        this.adSeconds = 10;
        this.currentAdType = null;
        
        this.init();
    }

    async init() {
        // Initialize Telegram WebApp
        if (typeof Telegram !== 'undefined') {
            this.tg = Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            console.log('Telegram WebApp initialized');
        } else {
            console.log('Running in browser mode');
        }
        
        // Initialize Adexium
        this.initAdexium();
        
        // Load user data
        await this.loadUserData();
        
        // Hide loading screen
        this.hideLoading();
        
        // Load tasks
        this.loadTasks();
    }

    initAdexium() {
        // Initialize Adexium widget
        try {
            if (typeof AdexiumWidget !== 'undefined') {
                window.adexiumWidget = new AdexiumWidget({
                    wid: '593e85f5-6028-4ee2-bf80-f7729b16a482',
                    adFormat: 'interstitial'
                });
            }
        } catch (error) {
            console.error('Failed to initialize Adexium:', error);
        }
    }

    async loadUserData() {
        try {
            // For testing, create mock user data
            const mockUserId = this.tg ? this.tg.initDataUnsafe.user.id : 'test_user_' + Date.now();
            const mockUser = {
                id: mockUserId,
                username: this.tg ? this.tg.initDataUnsafe.user.username : 'testuser',
                first_name: this.tg ? this.tg.initDataUnsafe.user.first_name : 'Test',
                last_name: this.tg ? this.tg.initDataUnsafe.user.last_name || '' : 'User',
                balance: 0.525,
                total_earned: 1.234,
                today_earnings: 0.125,
                ads_watched: 156,
                tasks_completed: 5,
                referral_count: 3,
                status: 'active'
            };
            
            this.user = mockUser;
            this.updateUI();
            
            // In production, use this:
            /*
            const response = await fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.tg.initDataUnsafe.user.id,
                    username: this.tg.initDataUnsafe.user.username,
                    first_name: this.tg.initDataUnsafe.user.first_name,
                    last_name: this.tg.initDataUnsafe.user.last_name
                })
            });
            
            this.user = await response.json();
            this.updateUI();
            */
            
        } catch (error) {
            console.error('Failed to load user:', error);
            // Fallback to mock data
            this.user = this.getMockUser();
            this.updateUI();
        }
    }

    updateUI() {
        // Update balance display
        document.getElementById('balance').textContent = this.user.balance.toFixed(3) + ' TON';
        document.getElementById('todayEarnings').textContent = (this.user.today_earnings || 0).toFixed(3) + ' TON';
        document.getElementById('totalEarned').textContent = this.user.total_earned.toFixed(3) + ' TON';
        document.getElementById('adsToday').textContent = (this.user.ads_watched || 0) + '/3000';
        document.getElementById('earnedToday').textContent = (this.user.today_earnings || 0).toFixed(3) + ' TON';
        document.getElementById('referralCount').textContent = this.user.referral_count || 0;
        document.getElementById('tasksDone').textContent = this.user.tasks_completed || 0;
        document.getElementById('walletBalance').textContent = this.user.balance.toFixed(3) + ' TON';
        
        // Update progress bar
        const progress = Math.min(((this.user.ads_watched || 0) / 3000) * 100, 100);
        document.getElementById('dailyProgress').style.width = progress + '%';
        document.getElementById('dailyAds').textContent = this.user.ads_watched || 0;
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.content').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        document.getElementById(screenName + '-screen').classList.add('active');
        
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('main').classList.add('active');
    }

    async watchAd(adType) {
        this.currentAdType = adType;
        this.adSeconds = 10; // 10 seconds for demo
        
        // Show ad modal
        const modal = document.getElementById('adModal');
        modal.style.display = 'flex';
        
        // Load ad based on type
        this.loadAd(adType);
        
        // Start countdown
        this.startAdTimer();
    }

    loadAd(adType) {
        const container = document.getElementById('adContainer');
        
        switch(adType) {
            case 'monetag':
                container.innerHTML = `
                    <div class="ad-placeholder">
                        <h4>Monetag Advertisement</h4>
                        <p>This is a sample Monetag ad</p>
                        <div class="ad-content">
                            🎬 VIDEO ADVERTISEMENT 🎬
                            <p>Watch this video to earn TON</p>
                        </div>
                        <p class="ad-note">In production, real ads will load here</p>
                    </div>
                `;
                break;
                
            case 'adexium':
                container.innerHTML = `
                    <div class="ad-placeholder">
                        <h4>Adexium Advertisement</h4>
                        <p>Loading interactive ad...</p>
                        <div class="ad-content">
                            🎯 INTERACTIVE AD 🎯
                            <p>Engage with this ad to earn rewards</p>
                        </div>
                        <p class="ad-note">Real Adexium ads will load in production</p>
                    </div>
                `;
                // In production, trigger Adexium ad
                // if (window.adexiumWidget) {
                //     window.adexiumWidget.showAd();
                // }
                break;
                
            case 'adsgram':
                container.innerHTML = `
                    <div class="ad-placeholder">
                        <h4>AdsGram Advertisement</h4>
                        <iframe src="https://otieu.com/4/10551270" 
                                style="width:100%; height:200px; border:none; border-radius:10px;"></iframe>
                        <p class="ad-note">CPM-based advertising</p>
                    </div>
                `;
                break;
        }
    }

    startAdTimer() {
        let seconds = this.adSeconds;
        const countdownEl = document.getElementById('countdown');
        const timerText = document.getElementById('timerText');
        const completeBtn = document.getElementById('completeBtn');
        const timerCircle = document.querySelector('.timer-circle');
        
        // Reset UI
        completeBtn.style.display = 'none';
        countdownEl.textContent = seconds;
        timerText.textContent = seconds + ' seconds';
        
        // Clear existing timer
        if (this.adTimer) {
            clearInterval(this.adTimer);
        }
        
        this.adTimer = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            timerText.textContent = seconds + ' second' + (seconds !== 1 ? 's' : '');
            
            // Update circle progress
            const progress = ((this.adSeconds - seconds) / this.adSeconds) * 100;
            timerCircle.style.background = `conic-gradient(#0088cc ${progress}%, #eee ${progress}%)`;
            
            if (seconds <= 0) {
                clearInterval(this.adTimer);
                completeBtn.style.display = 'block';
                timerText.textContent = 'Ad complete! Click to earn';
            }
        }, 1000);
    }

    async completeAd() {
        try {
            // Close ad modal
            document.getElementById('adModal').style.display = 'none';
            
            // Simulate API call
            const reward = this.calculateAdReward();
            
            // Update user locally
            this.user.balance += reward;
            this.user.total_earned += reward;
            this.user.today_earnings = (this.user.today_earnings || 0) + reward;
            this.user.ads_watched = (this.user.ads_watched || 0) + 1;
            
            this.updateUI();
            
            // Show success message
            this.showSuccess(reward, this.user.balance);
            
            // In production, use this:
            /*
            const response = await fetch('/api/earn/ad', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    adNetwork: this.currentAdType
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.user.balance = result.newBalance;
                this.updateUI();
                this.showSuccess(result.reward, result.newBalance);
            }
            */
            
        } catch (error) {
            console.error('Failed to complete ad:', error);
            alert('Error: ' + error.message);
        }
    }

    skipAd() {
        if (this.adTimer) {
            clearInterval(this.adTimer);
        }
        document.getElementById('adModal').style.display = 'none';
        alert('Ad skipped. No reward earned.');
    }

    calculateAdReward() {
        const adsWatched = this.user.ads_watched || 0;
        
        // Tier-based rewards
        if (adsWatched < 400) {
            return 0.005;
        } else if (adsWatched < 1000) {
            return 0.05;
        } else {
            return 0.08;
        }
    }

    showSuccess(reward, newBalance) {
        document.getElementById('rewardAmount').textContent = reward.toFixed(3);
        document.getElementById('newBalance').textContent = newBalance.toFixed(3);
        document.getElementById('successModal').style.display = 'flex';
    }

    closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }

    async loadTasks() {
        try {
            const tasks = [
                {
                    id: 'task1',
                    title: 'Join Telegram Channel',
                    description: 'Join our official Telegram channel and stay updated',
                    reward: 0.1,
                    type: 'official',
                    clicks_required: 100,
                    clicks_done: 25
                },
                {
                    id: 'task2',
                    title: 'Follow on Twitter',
                    description: 'Follow us on Twitter for latest updates',
                    reward: 0.05,
                    type: 'official',
                    clicks_required: 50,
                    clicks_done: 10
                },
                {
                    id: 'task3',
                    title: 'Visit Website',
                    description: 'Visit our website and explore features',
                    reward: 0.02,
                    type: 'official',
                    clicks_required: 200,
                    clicks_done: 80
                }
            ];
            
            this.renderTasks(tasks);
            
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    renderTasks(tasks) {
        const container = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            container.innerHTML = '<p>No tasks available at the moment.</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-card">
                <h4>${task.title}</h4>
                <p>${task.description}</p>
                <div class="task-info">
                    <span class="reward">💰 ${task.reward} TON</span>
                    <span class="progress">${task.clicks_done}/${task.clicks_required} clicks</span>
                </div>
                <button class="btn-task" onclick="app.completeTask('${task.id}')">
                    Complete Task
                </button>
            </div>
        `).join('');
    }

    async completeTask(taskId) {
        try {
            const reward = 0.05; // Mock reward
            
            // Update user locally
            this.user.balance += reward;
            this.user.total_earned += reward;
            this.user.tasks_completed = (this.user.tasks_completed || 0) + 1;
            
            this.updateUI();
            
            this.showSuccess(reward, this.user.balance);
            
            // In production, use this:
            /*
            const response = await fetch('/api/tasks/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    taskId: taskId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.user.balance = result.newBalance;
                this.updateUI();
                this.showSuccess(result.reward, result.newBalance);
            }
            */
            
        } catch (error) {
            console.error('Failed to complete task:', error);
            alert('Error: ' + error.message);
        }
    }

    async requestWithdrawal() {
        const address = document.getElementById('walletAddress').value;
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        
        if (!address) {
            alert('Please enter your TON wallet address');
            return;
        }
        
        if (!amount || amount < 2) {
            alert('Minimum withdrawal is 2 TON');
            return;
        }
        
        if (amount > this.user.balance) {
            alert('Insufficient balance');
            return;
        }
        
        const fee = amount * 0.20;
        const netAmount = amount - fee;
        
        if (confirm(`Withdraw ${amount} TON?\nFee: ${fee.toFixed(3)} TON (20%)\nYou receive: ${netAmount.toFixed(3)} TON`)) {
            try {
                // Update user locally
                this.user.balance -= amount;
                this.updateUI();
                
                alert('Withdrawal request submitted!\nAmount: ' + amount + ' TON\nFee: ' + fee.toFixed(3) + ' TON\nNet: ' + netAmount.toFixed(3) + ' TON\n\nProcessing time: 5-30 minutes');
                
                // Clear form
                document.getElementById('walletAddress').value = '';
                document.getElementById('withdrawAmount').value = '';
                
                // In production, use this:
                /*
                const response = await fetch('/api/withdraw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: this.user.id,
                        amount: amount,
                        walletAddress: address
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    this.user.balance = this.user.balance - amount;
                    this.updateUI();
                    alert('Withdrawal request submitted! ID: ' + result.withdrawalId);
                }
                */
                
            } catch (error) {
                console.error('Failed to withdraw:', error);
                alert('Error: ' + error.message);
            }
        }
    }

    getMockUser() {
        return {
            id: 'test_user_' + Date.now(),
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            balance: 0.525,
            total_earned: 1.234,
            today_earnings: 0.125,
            ads_watched: 156,
            tasks_completed: 5,
            referral_count: 3,
            status: 'active'
        };
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AdTONXApp();
});

// Global functions for HTML onclick
function showScreen(screenName) {
    if (app) app.showScreen(screenName);
}

function watchAd(adType) {
    if (app) app.watchAd(adType);
}

function completeAd() {
    if (app) app.completeAd();
}

function skipAd() {
    if (app) app.skipAd();
}

function closeSuccessModal() {
    if (app) app.closeSuccessModal();
}

function requestWithdrawal() {
    if (app) app.requestWithdrawal();
}