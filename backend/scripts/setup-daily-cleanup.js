const cron = require('node-cron');
const { cleanupOldCancelledOrders, getCleanupStats } = require('./cleanup-old-orders');

/**
 * Setup daily cleanup job
 * Runs every day at 2:00 AM to clean up old cancelled orders
 */
function setupDailyCleanup() {
    console.log('🕐 Setting up daily cleanup job...');

    // Schedule cleanup to run daily at 11:59 PM (end of day reset)
    const cleanupJob = cron.schedule('59 23 * * *', async() => {
        console.log('🕐 Running scheduled cleanup...');
        try {
            const result = await cleanupOldCancelledOrders();
            console.log('✅ Scheduled cleanup completed:', result);
        } catch (error) {
            console.error('❌ Scheduled cleanup failed:', error);
        }
    }, {
        scheduled: false, // Don't start automatically
        timezone: "Asia/Manila" // Set to Philippines timezone
    });

    console.log('✅ Daily cleanup job scheduled for 11:59 PM (Asia/Manila timezone)');

    return cleanupJob;
}

/**
 * Start the cleanup job
 */
function startCleanupJob() {
    const job = setupDailyCleanup();
    job.start();
    console.log('🚀 Daily cleanup job started');
    return job;
}

/**
 * Stop the cleanup job
 */
function stopCleanupJob(job) {
    if (job) {
        job.stop();
        console.log('⏹️ Daily cleanup job stopped');
    }
}

/**
 * Run cleanup immediately (for testing)
 */
async function runCleanupNow() {
    console.log('🧹 Running immediate cleanup...');
    try {
        const stats = await getCleanupStats();
        console.log('📊 Current cleanup stats:', stats);

        const result = await cleanupOldCancelledOrders();
        console.log('✅ Immediate cleanup completed:', result);

        return result;
    } catch (error) {
        console.error('❌ Immediate cleanup failed:', error);
        throw error;
    }
}

// If running directly, start the job
if (require.main === module) {
    const job = startCleanupJob();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down cleanup job...');
        stopCleanupJob(job);
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down cleanup job...');
        stopCleanupJob(job);
        process.exit(0);
    });
}

module.exports = {
    setupDailyCleanup,
    startCleanupJob,
    stopCleanupJob,
    runCleanupNow
};