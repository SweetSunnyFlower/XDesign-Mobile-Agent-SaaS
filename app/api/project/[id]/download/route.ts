import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import JSZip from "jszip";
import { getStandaloneHTMLWrapper } from "@/lib/frame-wrapper";
import { THEME_LIST } from "@/lib/themes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        userId: user.id,
        id: id,
      },
      include: {
        frames: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.frames || project.frames.length === 0) {
      return NextResponse.json(
        { error: "No frames found in project" },
        { status: 400 }
      );
    }

    // Create a zip file
    const zip = new JSZip();

    // Get all frame IDs for navigation
    const frameIds = project.frames.map((frame) => ({
      id: frame.id,
      title: frame.title,
    }));

    // Find theme style from theme ID
    const themeStyle = project.theme
      ? THEME_LIST.find((t) => t.id === project.theme)?.style
      : undefined;

    // Add each frame as an HTML file
    for (const frame of project.frames) {
      const filename = `${frame.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
      const htmlContent = getStandaloneHTMLWrapper(
        frame.htmlContent,
        frame.title,
        themeStyle,
        project.deviceType as 'mobile' | 'web',
        frameIds
      );
      zip.file(filename, htmlContent);
    }

    // Generate the zip file
    const zipContent = await zip.generateAsync({ type: "arraybuffer" });

    // Return the zip file as a download
    return new NextResponse(zipContent, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]+/gi, "-")}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error generating zip:", error);
    return NextResponse.json(
      { error: "Failed to generate zip file" },
      { status: 500 }
    );
  }
}
