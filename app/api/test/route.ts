import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateProjectName } from "@/app/action/action";
import { addGenerateScreensJob } from "@/lib/queue";

export async function GET(request: Request) {
  try {
    //Trigger the BullMQ job
    const projectName = await generateProjectName("hi");

    return NextResponse.json({
      success: true,
      data: projectName,
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
