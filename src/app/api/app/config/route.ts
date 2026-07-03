import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/constants";

export async function GET() {
  return NextResponse.json({
    mode: isDatabaseConfigured() ? "database" : "demo",
  });
}
