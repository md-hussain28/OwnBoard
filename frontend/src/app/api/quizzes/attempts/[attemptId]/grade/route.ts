import { type NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const body = await request.json();
  return proxyRequest("post", `/quizzes/attempts/${attemptId}/grade`, { data: body });
}
