import type { Request, Response, NextFunction, RequestHandler } from "express";
import { findUserById } from "@/lib/db/repositories";
import { decryptSession } from "@/lib/session";

export type AuthedRequest = Request & { userId: string };

export async function resolveBearerUserId(
  req: Request,
): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;

  try {
    const payload = await decryptSession(token);
    if (!payload?.userId) return null;
    const user = await findUserById(payload.userId);
    if (!user) return null;
    if ((user.sessionVersion ?? 0) !== payload.sessionVersion) return null;
    return user.id;
  } catch (e) {
    console.error("resolveBearerUserId:", e);
    return null;
  }
}

/** Requires Authorization: Bearer <session JWT>. Sets req.userId. */
export const requireBearerAuth: RequestHandler = async (req, res, next) => {
  const userId = await resolveBearerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
};

export function getRequestUserId(req: Request): string {
  const userId = (req as AuthedRequest).userId;
  if (!userId) {
    throw new Error("Missing authenticated userId on request");
  }
  return userId;
}

export function assertAuthed(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void requireBearerAuth(req, res, next);
}
