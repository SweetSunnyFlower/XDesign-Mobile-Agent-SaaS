"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken } from "@inngest/realtime";

export async function fetchRealtimeSubscriptionToken() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) throw new Error("Unauthorized");

  // This creates a token using the Inngest API that is bound to the channel and topic:
  const token = await getSubscriptionToken(inngest, {
    channel: `user:${user.id}`,
    topics: [
      "generation.start",
      "analysis.start",
      "analysis.complete",
      "frame.created",
      "generation.complete",
    ],
  });

  return token;
}
