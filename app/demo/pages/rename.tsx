"use client"

import { notePage } from "./note"

/** Reachable only from `/projects/[id]` — one dynamic route, matched live. */
export const renamePage = notePage(
  "rename",
  "Rename This Project",
  <>
    <p>
      The command that opens this is filed under{" "}
      <code>&quot;/projects/[id]&quot;</code>. The rule is written the way the
      route is written; the path it is matched against is the real one, so
      <code> /projects/atlas</code> is covered and <code> /projects</code> is
      not.
    </p>
    <p className="text-xs">
      A dynamic segment matches exactly one segment, the way the router treats
      it. <code>[...slug]</code> matches the rest of the path instead.
    </p>
  </>,
  "hidden"
)
