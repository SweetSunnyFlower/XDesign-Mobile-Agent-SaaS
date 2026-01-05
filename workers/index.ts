import "dotenv/config";
import { Worker, Job } from 'bullmq';
import redis from '../lib/redis';
import { generateScreensProcessor } from './processors/generateScreens';
import { regenerateFrameProcessor } from './processors/regenerateFrame';
import { GenerateScreensJobData, RegenerateFrameJobData } from '../lib/queue';

type JobData = GenerateScreensJobData | RegenerateFrameJobData;

console.log(`
╭─────────────────────────────────────────────────╮
│  🔨 XDesign Worker Starting                     │
│                                                 │
│  ➜ Queue:     xdesign-generation                │
│  ➜ Redis:     ${process.env.REDIS_URL || 'redis://localhost:6379'}    │
│  ➜ Concurrency: 2                               │
╰─────────────────────────────────────────────────╯
`);

// Create BullMQ Worker
const worker = new Worker<JobData>(
  'xdesign-generation',
  async (job: Job<JobData>) => {
    console.log(`\n📥 Processing job: ${job.name} (ID: ${job.id})`);
    console.log(`   User ID: ${job.data.userId}`);
    console.log(`   Project ID: ${job.data.projectId}`);

    // Route to appropriate processor based on job name
    switch (job.name) {
      case 'generate-screens':
        return await generateScreensProcessor(job as Job<GenerateScreensJobData>);

      case 'regenerate-frame':
        return await regenerateFrameProcessor(job as Job<RegenerateFrameJobData>);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process up to 2 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per 60 seconds
    },
  }
);

// Event: Job completed successfully
worker.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.name} (ID: ${job.id})`);
});

// Event: Job failed
worker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.name} (ID: ${job?.id})`);
  console.error(`   Error: ${err.message}`);
  console.error(`   Attempts: ${job?.attemptsMade}/${job?.opts.attempts}`);
});

// Event: Job progress
worker.on('progress', (job, progress) => {
  console.log(`⏳ Job progress: ${job.name} (ID: ${job.id}) → ${progress}%`);
});

// Event: Worker is ready
worker.on('ready', () => {
  console.log('✅ Worker is ready and waiting for jobs');
});

// Event: Worker error
worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    await worker.close();
    console.log('✅ Worker closed');

    // Close Redis connection
    await redis.quit();
    console.log('✅ Redis connection closed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('👂 Worker is listening for jobs...\n');
