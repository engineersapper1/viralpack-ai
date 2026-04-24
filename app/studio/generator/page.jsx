import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GeneratorClient from "./GeneratorClient";

export default async function GeneratorPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("vp_beta")) redirect("/");
  return <GeneratorClient />;
}
