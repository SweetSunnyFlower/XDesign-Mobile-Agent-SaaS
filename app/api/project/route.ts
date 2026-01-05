import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateProjectName } from "@/app/action/action";
import { inngest } from "@/inngest/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.log("Error occured ", error);
    return NextResponse.json(
      {
        error: "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Missing Prompt" }, { status: 400 });
    }

    const userId = user.id;

    const projectName = await generateProjectName(prompt);

    const project = await prisma.project.create({
      data: {
        userId,
        name: projectName,
      },
    });

    //Trigger the Inngest
    try {
      await inngest.send({
        name: "ui/generate.screens",
        data: {
          userId,
          projectId: project.id,
          prompt,
        },
      });
    } catch (error) {
      console.log(error);
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.log("Error occured ", error);
    return NextResponse.json(
      {
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}
