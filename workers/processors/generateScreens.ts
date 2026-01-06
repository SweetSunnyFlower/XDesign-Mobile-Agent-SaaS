import { Job } from "bullmq";
import { generateText, Output, stepCountIs } from "ai";
import { deepseek } from "@/lib/deepseek";
import { z } from "zod";
import { FrameType } from "@/types/project";
import { ANALYSIS_PROMPT, GENERATION_SYSTEM_PROMPT } from "@/lib/prompt";
import prisma from "@/lib/prisma";
import { BASE_VARIABLES, THEME_LIST } from "@/lib/themes";
import { unsplashTool } from "@/lib/tools";
import { emitToUser } from "../utils/emitProgress";
import { GenerateScreensJobData } from "@/lib/queue";

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
    .max(4),
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

    // STEP 2: Create frames first to get database IDs
    console.log(
      `[generateScreens] Step 2: Creating ${analysis.screens.length} frames in database`
    );

    const createdFrames: FrameType[] = [];
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

    // Emit frames with database IDs
    await emitToUser(userId, "frames.created", {
      frames: createdFrames,
      projectId: projectId,
    });

    // STEP 3: Generate HTML for each screen
    console.log(
      `[generateScreens] Step 3: Generating HTML for ${analysis.screens.length} screens`
    );

    const generatedFrames: FrameType[] = isExistingGeneration
      ? [...frames!]
      : [];

    for (let i = 0; i < analysis.screens.length; i++) {
      const screenPlan = analysis.screens[i];
      const frameToUpdate = createdFrames[i]; // Get corresponding frame
      const selectedTheme = THEME_LIST.find(
        (t) => t.id === analysis.themeToUse
      );

      console.log(
        `[generateScreens] Generating screen ${i + 1}/${
          analysis.screens.length
        }: ${screenPlan.name}`
      );

      //Combine the Theme Styles + Base Variable
      const fullThemeCSS = `
        ${BASE_VARIABLES}
        ${selectedTheme?.style || ""}
      `;

      // Get all previous existing or generated frames
      const allPreviousFrames = generatedFrames.slice(0, i);
      const previousFramesContext = allPreviousFrames
        .map((f: FrameType) => `<!-- ${f.title} -->\n${f.htmlContent}`)
        .join("\n\n");

      // Generate screen HTML with AI
      const result = await generateText({
        model: deepseek("deepseek-v3-1-250821"),
        system: GENERATION_SYSTEM_PROMPT,
        tools: {
          searchUnsplash: unsplashTool,
        },
        stopWhen: stepCountIs(5),
        prompt: `
        - Screen ${i + 1}/${analysis.screens.length}
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

      let finalHtml = result.text ?? "";
      const match = finalHtml.match(/<div[\s\S]*<\/div>/);
      finalHtml = match ? match[0] : finalHtml;
      finalHtml = finalHtml.replace(/```/g, "");

      // Update the frame with generated HTML
      const updatedFrame = await prisma.frame.update({
        where: { id: frameToUpdate.id },
        data: { htmlContent: finalHtml },
      });

      // Add to generatedFrames for next iteration's context
      generatedFrames.push(updatedFrame);

      // Emit frame updated event
      await emitToUser(userId, "frame.updated", {
        frameId: updatedFrame.id,
        frame: updatedFrame,
        projectId: projectId,
      });

      // Update progress
      const progress = 30 + ((i + 1) / analysis.screens.length) * 60;
      await job.updateProgress(Math.round(progress));
    }

    // Emit generation complete
    await emitToUser(userId, "generation.complete", {
      status: "completed",
      projectId: projectId,
    });

    await job.updateProgress(100);

    console.log(`[generateScreens] Job ${job.id} completed successfully`);
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
