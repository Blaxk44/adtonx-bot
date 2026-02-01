class AdRewardEngine {
    constructor() {
        this.tiers = {
            monetag: {
                0: { base: 0.005, bonus: 0 },
                400: { base: 0.05, bonus: 0 },
                1000: { base: 0.08, bonus: 0 }
            },
            adsgram: {
                0: { base: 0.005, bonus: 0 },
                400: { base: 0.05, bonus: 0 },
                1000: { base: 0.08, bonus: 0 }
            },
            adsaxium: {
                0: { base: 0.005, bonus: 0 },
                400: { base: 0.05, bonus: 0 },
                1000: { base: 0.08, bonus: 0 }
            }
        };
        
        this.dailyLimits = {
            maxAds: 3000,
            maxEarnings: 150 // TON
        };
    }

    async calculateReward(userId, adNetwork) {
        // Get user's ad count for today
        const userAds = await this.getUserAdsToday(userId);
        const totalAds = userAds.total;
        const networkAds = userAds[adNetwork] || 0;
        
        // Check daily limit
        if (totalAds >= this.dailyLimits.maxAds) {
            throw new Error('Daily ad limit reached');
        }
        
        // Determine tier
        let tier = 0;
        if (networkAds >= 1000) tier = 1000;
        else if (networkAds >= 400) tier = 400;
        
        const tierConfig = this.tiers[adNetwork][tier];
        
        // Calculate CPM bonus
        const cpmBonus = await this.calculateCPMBonus(userId);
        
        // Calculate referral bonus
        const referralBonus = await this.calculateReferralBonus(userId);
        
        // Total reward
        const totalReward = tierConfig.base + cpmBonus + referralBonus;
        
        return {
            baseReward: tierConfig.base,
            cpmBonus,
            referralBonus,
            totalReward,
            nextTier: this.getNextTier(networkAds),
            adsUntilNextTier: this.getAdsUntilNextTier(networkAds)
        };
    }

    async calculateCPMBonus(userId) {
        // Get user's CPM clicks this week
        const cpmClicks = await this.getWeeklyCPMClicks(userId);
        
        if (cpmClicks >= 10000) {
            return 0.25; // Weekly bonus
        }
        
        // CPM earnings (0.0028 per click)
        const cpmEarnings = cpmClicks * 0.0028;
        
        return cpmEarnings;
    }

    async calculateReferralBonus(userId) {
        // Get active referrals
        const activeRefs = await this.getActiveReferrals(userId);
        
        // 0.005 TON per active referral
        return activeRefs * 0.005;
    }

    async getUserAdsToday(userId) {
        // TODO: Query database for today's ads
        return {
            total: 156,
            monetag: 50,
            adsgram: 56,
            adsaxium: 50
        };
    }

    async getWeeklyCPMClicks(userId) {
        // TODO: Query database for weekly CPM
        return 3420;
    }

    async getActiveReferrals(userId) {
        // TODO: Query database for active referrals
        return 3;
    }

    getNextTier(currentAds) {
        if (currentAds < 400) return 400;
        if (currentAds < 1000) return 1000;
        return null;
    }

    getAdsUntilNextTier(currentAds) {
        const nextTier = this.getNextTier(currentAds);
        if (!nextTier) return 0;
        return nextTier - currentAds;
    }
}

module.exports = AdRewardEngine;