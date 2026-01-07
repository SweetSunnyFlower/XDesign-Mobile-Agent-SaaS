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
  deviceType?: 'mobile' | 'web';
};

export type GenerateFrameJobData = {
  userId: string;
  projectId: string;
  frameId: string;
  screenPlan: {
    id: string;
    name: string;
    purpose: string;
    visualDescription: string;
  };
  theme: string;
  previousFrames: FrameType[];
  screenIndex: number;
  totalScreens: number;
  deviceType?: 'mobile' | 'web';
};

export type RegenerateFrameJobData = {
  userId: string;
  projectId: string;
  frameId: string;
  prompt: string;
  theme: string;
  frame: FrameType;
  deviceType?: 'mobile' | 'web';
};

// Job name types
export type JobName = 'generate-screens' | 'generate-frame' | 'regenerate-frame';

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

export const addGenerateFrameJob = async (data: GenerateFrameJobData) => {
  return await queue.add('generate-frame', data, {
    // Frame generation jobs can run in parallel
    // Remove delay to allow concurrent execution
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};

export const addRegenerateFrameJob = async (data: RegenerateFrameJobData) => {
  return await queue.add('regenerate-frame', data);
};

export default queue;
