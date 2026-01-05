import { Queue } from 'bullmq';
import redis from './redis';
import { FrameType } from '@/types/project';

// Job data type definitions
export type GenerateScreensJobData = {
  userId: string;
  projectId: string;
  prompt: string;
  frames?: FrameType[];
  theme?: string;
};

export type RegenerateFrameJobData = {
  userId: string;
  projectId: string;
  frameId: string;
  prompt: string;
  theme: string;
  frame: FrameType;
};

// Job name types
export type JobName = 'generate-screens' | 'regenerate-frame';

// Create a single queue for all generation jobs
export const queue = new Queue('xdesign-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

// Type-safe job add functions
export const addGenerateScreensJob = async (data: GenerateScreensJobData) => {
  return await queue.add('generate-screens', data);
};

export const addRegenerateFrameJob = async (data: RegenerateFrameJobData) => {
  return await queue.add('regenerate-frame', data);
};

export default queue;
