import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }) {
  const cookieStore = await cookies();
  const hasAccess = cookieStore.get("vp_beta");

  if (!hasAccess) {
    redirect("/");
  }

  return children;
}