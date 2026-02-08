import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === "https:" && u.hostname === "images.pokemontcg.io";
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = (searchParams.get("url") ?? "").trim();

  if (!url || !isAllowed(url)) {
    return new Response("Invalid url", { status: 400 });
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "force-cache",
  });

  if (!res.ok) {
    return new Response(`Upstream error ${res.status}`, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "image/png";
  const body = await res.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
