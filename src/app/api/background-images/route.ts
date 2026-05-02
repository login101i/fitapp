import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export async function GET() {
  const dir = path.join(process.cwd(), "public", "images");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f));
  } catch {
    files = [];
  }
  files.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const urls = files.map((f) => `/images/${encodeURIComponent(f)}`);
  return NextResponse.json({ urls });
}
