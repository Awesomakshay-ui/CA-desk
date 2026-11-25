import { getBriefing } from "@/lib/notice-feeds";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  return Response.json(await getBriefing(force), { headers: { "Cache-Control": "no-store" } });
}
