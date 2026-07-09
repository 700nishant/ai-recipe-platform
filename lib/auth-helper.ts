import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getUserEmail(request: Request): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      return session.user.email;
    }
  } catch (e) {
    console.warn("Failed to retrieve session in getUserEmail helper:", e);
  }

  // Fallback to request header
  const headerEmail = request.headers.get("x-user-email");
  if (headerEmail) {
    return headerEmail;
  }

  return "anonymous";
}
