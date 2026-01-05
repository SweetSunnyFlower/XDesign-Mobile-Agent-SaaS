"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken } from "@inngest/realtime";
import { auth } from "@/lib/auth";

export async function fetchRealtimeSubscriptionToken() {
  const session = await auth();
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
