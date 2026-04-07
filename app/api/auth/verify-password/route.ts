import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(req: Request) {
  const body = (await req.json()) as { password: string };

  if (body.password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("admin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "密码错误" }, { status: 401 });
}
