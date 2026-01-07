import { Job } from "bullmq";
import { generateText, stepCountIs } from "ai";
import { deepseek } from "@/lib/deepseek";
import { getGenerationPrompt } from "@/lib/prompt";
import prisma from "@/lib/prisma";
import { BASE_VARIABLES, THEME_LIST } from "@/lib/themes";
import { unsplashTool } from "@/lib/tools";
import { emitToUser } from "../utils/emitProgress";
import { FrameType } from "@/types/project";

export interface GenerateFrameJobData {
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
  previousFrames: FrameType[]; // For context
  screenIndex: number; // For progress tracking
  totalScreens: number;
  deviceType?: 'mobile' | 'web';
}

/**
 * Generate Frame Processor (BullMQ)
 * Generates HTML for a single frame
 */
export const generateFrameProcessor = async (
  job: Job<GenerateFrameJobData>
): Promise<void> => {
  const {
    userId,
    projectId,
    frameId,
    screenPlan,
    theme,
    previousFrames,
    screenIndex,
    totalScreens,
    deviceType = 'mobile',
  } = job.data;

  try {
    console.log(
      `[generateFrame] Starting job ${job.id} for frame ${frameId} (${screenIndex + 1}/${totalScreens})`
    );

    // Check if frame already has content (idempotency)
    const existingFrame = await prisma.frame.findUnique({
      where: { id: frameId },
    });

    if (!existingFrame) {
      throw new Error(`Frame ${frameId} not found`);
    }

    if (existingFrame.htmlContent && existingFrame.htmlContent.trim() !== "") {
      console.log(
        `[generateFrame] Frame ${frameId} already has content, skipping`
      );
      await job.updateProgress(100);
      return;
    }

    await job.updateProgress(20);

    const selectedTheme = THEME_LIST.find((t) => t.id === theme);

    // Combine the Theme Styles + Base Variable
    const fullThemeCSS = `
      ${BASE_VARIABLES}
      ${selectedTheme?.style || ""}
    `;

    // Get previous frames context
    const previousFramesContext = previousFrames
      .map((f: FrameType) => `<!-- ${f.title} -->\n${f.htmlContent}`)
      .join("\n\n");

    await job.updateProgress(40);

    // Generate screen HTML with AI
    const result = await generateText({
      model: deepseek("deepseek-v3-1-250821"),
      system: getGenerationPrompt(deviceType),
      tools: {
        searchUnsplash: unsplashTool,
      },
      stopWhen: stepCountIs(5),
      prompt: `
        - Screen ${screenIndex + 1}/${totalScreens}
        - Screen ID: ${screenPlan.id}
        - Screen Name: ${screenPlan.name}
        - Screen Purpose: ${screenPlan.purpose}

        VISUAL DESCRIPTION: ${screenPlan.visualDescription}

        EXISTING SCREENS REFERENCE (Extract and reuse their components):
        ${previousFramesContext || "No previous screens"}

        THEME VARIABLES (Reference ONLY - already defined in parent, do NOT redeclare these):
        ${fullThemeCSS}

      CRITICAL REQUIREMENTS A MUST - READ CAREFULLY:
      - **If previous screens exist, COPY the EXACT bottom navigation component structure and styling - do NOT recreate it
      - **Extract common components (cards, buttons, headers) and reuse their styling
      - **Maintain the exact same visual hierarchy, spacing, and color scheme
      - **This screen should look like it belongs in the same app as the previous screens

      1. **Generate ONLY raw HTML markup for this mobile app screen using Tailwind CSS.**
        Use Tailwind classes for layout, spacing, typography, shadows, etc.
        Use theme CSS variables ONLY for color-related properties (bg-[var(--background)], text-[var(--foreground)], border-[var(--border)], ring-[var(--ring)], etc.)
      2. **All content must be inside a single root <div> that controls the layout.**
        - No overflow classes on the root.
        - All scrollable content must be in inner containers with hidden scrollbars: [&::-webkit-scrollbar]:hidden scrollbar-none
      3. **For absolute overlays (maps, bottom sheets, modals, etc.):**
        - Use \`relative w-full h-screen\` on the top div of the overlay.
      4. **For regular content:**
        - Use \`w-full h-full min-h-screen\` on the top div.
      5. **Do not use h-screen on inner content unless absolutely required.**
        - Height must grow with content; content must be fully visible inside an iframe.
      6. **For z-index layering:**
        - Ensure absolute elements do not block other content unnecessarily.
      7. **Output raw HTML only, starting with <div>.**
        - Do not include markdown, comments, <html>, <body>, or <head>.
      8. **Hardcode a style only if a theme variable is not needed for that element.**
      9. **Ensure iframe-friendly rendering:**
        - All elements must contribute to the final scrollHeight so your parent iframe can correctly resize.
      Generate the complete, production-ready HTML for this screen now
    `.trim(),
    });

    await job.updateProgress(80);

    let finalHtml = result.text ?? "";
    const match = finalHtml.match(/<div[\s\S]*<\/div>/);
    finalHtml = match ? match[0] : finalHtml;
    finalHtml = finalHtml.replace(/```/g, "");

    // Update the frame with generated HTML
    const updatedFrame = await prisma.frame.update({
      where: { id: frameId },
      data: { htmlContent: finalHtml },
    });

    // Emit frame updated event
    await emitToUser(userId, "frame.updated", {
      frameId: updatedFrame.id,
      frame: updatedFrame,
      projectId: projectId,
    });

    await job.updateProgress(100);

    console.log(
      `[generateFrame] Job ${job.id} completed successfully for frame ${frameId}`
    );
  } catch (error) {
    console.error(`[generateFrame] Job ${job.id} failed:`, error);

    // Emit error to user
    await emitToUser(userId, "frame.error", {
      frameId: frameId,
      error: error instanceof Error ? error.message : "Unknown error",
      projectId: projectId,
    });

    // Re-throw error to trigger BullMQ retry
    throw error;
  }
};
