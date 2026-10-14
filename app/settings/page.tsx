import { redirect } from "next/navigation";
import { getIsOwner } from "@/lib/owner";
import {
  firstSearchParam,
  resolveSettingsTab,
  settingsHrefWithoutRetiredTab,
} from "./_components/constants";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = firstSearchParam(params.tab);
  const retiredHref = settingsHrefWithoutRetiredTab(tab, params);
  if (retiredHref) redirect(retiredHref);

  const isOwner = await getIsOwner();
  return <SettingsClient isOwner={isOwner} initialTab={resolveSettingsTab(tab)} />;
}
