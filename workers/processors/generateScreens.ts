import { Job } from "bullmq";
import { generateText, Output } from "ai";
import { deepseek } from "@/lib/deepseek";
import { z } from "zod";
import { FrameType } from "@/types/project";
import { ANALYSIS_PROMPT } from "@/lib/prompt";
import prisma from "@/lib/prisma";
import { THEME_LIST } from "@/lib/themes";
import { emitToUser } from "../utils/emitProgress";
import { GenerateScreensJobData, addGenerateFrameJob } from "@/lib/queue";

const AnalysisSchema = z.object({
  theme: z
    .string()
    .describe(
      "The specific visual theme ID (e.g., 'midnight', 'ocean-breeze', 'neo-brutalism')."
    ),
  screens: z
    .array(
      z.object({
        id: z
          .string()
          .describe(
            "Unique identifier for the screen (e.g., 'home-dashboard', 'profile-settings', 'transaction-history'). Use kebab-case."
          ),
        name: z
          .string()
          .describe(
            "Short, descriptive name of the screen (e.g., 'Home Dashboard', 'Profile', 'Transaction History')"
          ),
        purpose: z
          .string()
          .describe(
            "One clear sentence explaining what this screen accomplishes for the user and its role in the app"
          ),
        visualDescription: z
          .string()
          .describe(
            "A dense, high-fidelity visual directive (like an image generation prompt). Describe the layout, specific data examples (e.g. 'Oct-Mar'), component hierarchy, and physical attributes (e.g. 'Chunky cards', 'Floating header','Floating action button', 'Bottom navigation',Header with user avatar)."
          ),
      })
    )
    .min(1)
    .max(20),
});

/**
 * Generate Screens Processor (BullMQ)
 * Converted from Inngest function
 */
export const generateScreensProcessor = async (
  job: Job<GenerateScreensJobData>
): Promise<void> => {
  const { userId, projectId, prompt, frames, theme: existingTheme } = job.data;

  const isExistingGeneration = Array.isArray(frames) && frames.length > 0;

  try {
    console.log(
      `[generateScreens] Starting job ${job.id} for project ${projectId}`
    );

    // Emit generation start
    await emitToUser(userId, "generation.start", {
      status: "running",
      projectId: projectId,
    });

    await job.updateProgress(10);

    // STEP 1: 分析规划
    console.log(`[generateScreens] Step 1: Analysis`);

    await emitToUser(userId, "analysis.start", {
      status: "analyzing",
      projectId: projectId,
    });

    const contextHTML = isExistingGeneration
      ? frames!
          .map(
            (frame: FrameType) =>
              `<!-- ${frame.title} -->\n${frame.htmlContent}`
          )
          .join("\n\n")
      : "";

    const analysisPrompt = isExistingGeneration
      ? `
        USER REQUEST: ${prompt}
        SELECTED THEME: ${existingTheme}

        EXISTING SCREENS (analyze for consistency navigation, layout, design system etc):
        ${contextHTML}

       CRITICAL REQUIREMENTS A MUST - READ CAREFULLY:
        - **Analyze the existing screens' layout, navigation patterns, and design system
        - **Extract the EXACT bottom navigation component structure and styling
        - **Identify common components (cards, buttons, headers) for reuse
        - **Maintain the same visual hierarchy and spacing
        - **Generate new screens that seamlessly blend with existing ones
      `.trim()
      : `
        USER REQUEST: ${prompt}
      `.trim();

    const { output } = await generateText({
      model: deepseek("deepseek-v3-1-250821"),
      output: Output.object({
        schema: AnalysisSchema,
      }),
      system: ANALYSIS_PROMPT,
      prompt: analysisPrompt,
    });

    console.log("Frame output", output);

    const themeToUse = isExistingGeneration ? existingTheme! : output.theme;
    console.log("isExistingGeneration", isExistingGeneration);
    console.log("themeToUse", themeToUse);
    console.log("userId",userId)
    console.log("projectId", projectId)
    if (!isExistingGeneration) {
      await prisma.project.update({
        where: {
          id: projectId,
          userId: userId,
        },
        data: { theme: themeToUse },
      });
    }

    await emitToUser(userId, "analysis.complete", {
      status: "generating",
      theme: themeToUse,
      totalScreens: output.screens.length,
      screens: output.screens,
      projectId: projectId,
    });

    await job.updateProgress(30);

    const analysis = { ...output, themeToUse };

    // STEP 2: Create frames first to get database IDs (with idempotency check)
    console.log(
      `[generateScreens] Step 2: Creating ${analysis.screens.length} frames in database`
    );

    let createdFrames: FrameType[] = [];

    // Check if frames already exist (for retry scenarios)
    const existingEmptyFrames = await prisma.frame.findMany({
      where: {
        projectId,
        htmlContent: "", // Only get empty frames (not yet generated)
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // If we have the exact number of empty frames, it's a retry - reuse them
    if (existingEmptyFrames.length === analysis.screens.length) {
      console.log(
        `[generateScreens] Found ${existingEmptyFrames.length} existing empty frames, reusing them (retry scenario)`
      );
      createdFrames = existingEmptyFrames;

      // Update titles to match new screen plans
      for (let i = 0; i < createdFrames.length; i++) {
        await prisma.frame.update({
          where: { id: createdFrames[i].id },
          data: { title: analysis.screens[i].name },
        });
        createdFrames[i].title = analysis.screens[i].name;
      }
    } else {
      // Clean up any orphaned empty frames from failed attempts
      if (existingEmptyFrames.length > 0) {
        console.log(
          `[generateScreens] Cleaning up ${existingEmptyFrames.length} orphaned empty frames`
        );
        await prisma.frame.deleteMany({
          where: {
            id: {
              in: existingEmptyFrames.map((f) => f.id),
            },
          },
        });
      }

      // Create new frames
      console.log(
        `[generateScreens] Creating ${analysis.screens.length} new frames`
      );
      for (const screenPlan of analysis.screens) {
        const frame = await prisma.frame.create({
          data: {
            projectId,
            title: screenPlan.name,
            htmlContent: "", // Empty initially, will be filled by AI
          },
        });
        createdFrames.push(frame);
      }
    }

    // Emit frames with database IDs
    await emitToUser(userId, "frames.created", {
      frames: createdFrames,
      projectId: projectId,
    });

    // STEP 3: Dispatch concurrent frame generation jobs
    console.log(
      `[generateScreens] Step 3: Dispatching ${analysis.screens.length} concurrent frame generation jobs`
    );

    // Get all existing frames with content (for context in later frames)
    const existingFramesWithContent = isExistingGeneration
      ? frames!.filter((f) => f.htmlContent && f.htmlContent.trim() !== "")
      : [];

    // Dispatch jobs for each frame in parallel
    const frameJobs = [];
    for (let i = 0; i < analysis.screens.length; i++) {
      const screenPlan = analysis.screens[i];
      const frameToUpdate = createdFrames[i];

      // Skip if frame already has content (retry scenario)
      if (frameToUpdate.htmlContent && frameToUpdate.htmlContent.trim() !== "") {
        console.log(
          `[generateScreens] Frame ${i + 1}/${
            analysis.screens.length
          }: ${screenPlan.name} already has content, skipping job dispatch`
        );
        continue;
      }

      // For context: include existing frames + frames that will be generated before this one
      // Note: Since jobs run in parallel, we can only provide existing frames as context
      const previousFrames = existingFramesWithContent;

      console.log(
        `[generateScreens] Dispatching job for frame ${i + 1}/${
          analysis.screens.length
        }: ${screenPlan.name}`
      );

      const jobPromise = addGenerateFrameJob({
        userId,
        projectId,
        frameId: frameToUpdate.id,
        screenPlan,
        theme: analysis.themeToUse,
        previousFrames,
        screenIndex: i,
        totalScreens: analysis.screens.length,
      });

      frameJobs.push(jobPromise);
    }

    // Wait for all jobs to be added to queue
    await Promise.all(frameJobs);

    console.log(
      `[generateScreens] Dispatched ${frameJobs.length} frame generation jobs`
    );

    await job.updateProgress(100);

    console.log(`[generateScreens] Job ${job.id} completed successfully`);
    console.log(
      `[generateScreens] Note: ${frameJobs.length} child jobs are running in parallel`
    );
  } catch (error) {
    console.error(`[generateScreens] Job ${job.id} failed:`, error);

    // Emit error to user (optional)
    await emitToUser(userId, "generation.error", {
      error: error instanceof Error ? error.message : "Unknown error",
      projectId: projectId,
    });

    // Re-throw error to trigger BullMQ retry
    throw error;
  }
};
