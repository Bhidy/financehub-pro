import { redirect } from "next/navigation";

/**
 * Legacy route alias.
 * Keeps external/bookmarked /home links working by canonicalizing to root.
 */
export default function HomeAliasPage() {
  redirect("/");
}
