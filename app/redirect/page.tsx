import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RedirectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get user with role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/auth/error?error=UserNotFound");
  }

  // Redirect based on role
  if (user.role === "PATIENT") {
    redirect("/portal");
  } else {
    redirect("/dashboard");
  }
}
