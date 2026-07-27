import { permanentRedirect } from "next/navigation";

/** Old `/sidebar` slug → SEO-friendly `/brand` (301). */
export default function SidebarRedirectPage() {
  permanentRedirect("/brand");
}
