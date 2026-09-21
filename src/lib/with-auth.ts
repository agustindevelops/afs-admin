import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

type AuthenticatedHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>>; session: Session },
) => Promise<Response> | Response;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, { ...context, session });
  };
}
