"use client"

import { notePage } from "./note"

/** Reachable only from `/admin/users` — see the `invite` command's `paths`. */
export const invitePage = notePage(
  "invite",
  "Invite a Teammate",
  <>
    <p>
      A page only ever pushed from one route. Nothing here guards it a second
      time and nothing has to: the only way in was a command that does not exist
      anywhere else, and its ⌘⇧I is dead everywhere else for the same reason.
    </p>
    <p className="text-xs">
      Which is why the rule belongs on the command rather than on the page. A
      page is somewhere you already are; a command is the offer to go there, and
      the offer is the thing worth withdrawing.
    </p>
  </>
)
