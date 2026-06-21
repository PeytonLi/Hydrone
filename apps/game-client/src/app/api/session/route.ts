import { NextRequest, NextResponse } from "next/server";
import { initEngine, loadSeed, getDb, sessions } from "@hydrone/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

let initialized = false;

async function ensureEngineInit() {
  if (!initialized && process.env.DATABASE_URL) {
    initEngine(process.env.DATABASE_URL);
    await loadSeed();
    initialized = true;
  }
}

/**
 * POST /api/session — create a new playthrough session.
 *
 * Body: { userId?: string }
 * Returns: { sessionId: string }
 *
 * Creates a session row in Postgres tied to a user ID,
 * starting at node-entrance (the authored start location).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureEngineInit();

    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "anon-" + randomUUID().slice(0, 8);
    const sessionId = "sess-" + randomUUID().slice(0, 8);

    if (process.env.DATABASE_URL) {
      const db = getDb();
      await db
        .insert(sessions)
        .values({
          session_id: sessionId,
          user_id: userId,
          current_location_id: "node-entrance",
          last_updated: new Date(),
        })
        .onConflictDoNothing();
    }

    return NextResponse.json({ sessionId, userId });
  } catch (err) {
    console.error("Session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/session?sessionId=xxx — check if a session exists.
 */
export async function GET(req: NextRequest) {
  try {
    await ensureEngineInit();

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const db = getDb();
      const [row] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.session_id, sessionId))
        .limit(1);

      if (row) {
        return NextResponse.json({
          exists: true,
          sessionId,
          userId: row.user_id,
        });
      }
    }

    return NextResponse.json({ exists: false, sessionId });
  } catch (err) {
    console.error("Session lookup failed:", err);
    return NextResponse.json(
      { error: "Failed to look up session" },
      { status: 500 },
    );
  }
}
