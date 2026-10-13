import { getIsOwner } from "@/lib/owner";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const isOwner = await getIsOwner();
  return <SettingsClient isOwner={isOwner} />;
}
