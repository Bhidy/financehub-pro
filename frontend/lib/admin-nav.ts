/**
 * ============================================================================
 * THE ADMIN NAV — one definition, one renderer
 * ============================================================================
 *
 * The public site learned this the hard way: its nav was re-typed in four
 * places and `/ar/symbol/[id]` shipped Arabic labels over English links. So
 * lib/nav.json became the single definition and a build gate now fails any
 * file that hand-writes three or more of its destinations.
 *
 * This is the same contract for the console, applied before the same mistake
 * can happen. Add a page here and it appears in the rail and the mobile
 * drawer at once; there is no second list to remember.
 *
 * Deliberately NOT part of lib/nav.json. That file is the PUBLIC nav, read by
 * three renderers including a vanilla one on the static pages; putting
 * /admin routes in it would advertise the console on every marketing page.
 */

import type { LucideIcon } from "lucide-react";
import { BarChart3, Users, Radio } from "lucide-react";

export interface AdminNavItem {
    href: string;
    label: string;
    /** Shown under the label in the drawer; also the page's own subtitle. */
    description: string;
    icon: LucideIcon;
    /**
     * Kept out of the rail, but still routed and still gated.
     *
     * Hidden rather than deleted (owner instruction, 2026-09-07): the pages
     * work, their URLs stay valid, and `activeAdminItem` still lights the
     * right entry if one is opened directly — restoring one is deleting a
     * single line, not rebuilding a page.
     */
    hidden?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
    {
        href: "/admin/analytics",
        label: "Analytics",
        description: "Assistant health, demand and newsletter engagement",
        icon: BarChart3,
        hidden: true,
    },
    {
        href: "/admin/users",
        label: "Users",
        description: "Every registered account, and the controls to manage them",
        icon: Users,
    },
    {
        href: "/admin/sessions",
        label: "Guest sessions",
        description: "Pre-registration activity and conversion",
        icon: Radio,
        hidden: true,
    },
];

/**
 * The item whose page is currently open.
 *
 * Longest-match, not `startsWith` on the first hit: a future /admin/users/[id]
 * must light up "Users", and a prefix scan in declaration order would light up
 * whichever item happened to be listed first. This repo has already shipped
 * the prefix-matching version of this bug on /ar routes, where parent-route
 * prefix matching 404'd every news article.
 */
/** What the rail renders. Hidden entries stay routable, just unlisted. */
export const VISIBLE_ADMIN_NAV: AdminNavItem[] = ADMIN_NAV.filter((i) => !i.hidden);

export function activeAdminItem(pathname: string): AdminNavItem | undefined {
    return ADMIN_NAV.filter(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    ).sort((a, b) => b.href.length - a.href.length)[0];
}
