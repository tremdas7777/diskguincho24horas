import { createFileRoute } from "@tanstack/react-router";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as any;
        const password = String(body?.password ?? "");
        return Response.json({ ok: isAdminPasswordValid(password) });
      },
    },
  },
});

