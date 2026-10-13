import { redirect } from "next/navigation";
import { getIsOwner } from "@/lib/owner";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isOwner = await getIsOwner();
  if (!isOwner) redirect("/");
  return children;
}
