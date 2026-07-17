import { proxyRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyRequest("post", "/employees/invitations", { data: body });
}
