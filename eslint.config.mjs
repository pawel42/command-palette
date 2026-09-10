import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

/**
 * `components/command-palette/` is meant to be copied into another project as
 * one folder, and to read as three layers stacked in one direction:
 *
 *     core -> react -> ui
 *
 * These rules are what keep both of those true. Every violation below compiles
 * perfectly well — the check is the only thing standing between the folder and
 * a slow drift back into being app-specific.
 */
/**
 * Two rules the palette must not break, in every one of its files. A nested
 * `no-restricted-imports` replaces this one rather than adding to it, so each
 * block below spreads these back in.
 */
const staysCopyable = [
  {
    group: ["@/*"],
    message:
      "The palette must not reach into the app — it has to survive being copied out. Use a relative import, or take the value as a prop.",
  },
  {
    group: ["next", "next/*", "next-themes"],
    message:
      "The palette is framework-agnostic. Let the host pass framework-specific behavior in as a child or a prop.",
  },
]

const restrict = (files, patterns, extra = {}) => ({
  files,
  ...extra,
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: [...staysCopyable, ...patterns] },
    ],
  },
})

const paletteBoundaries = [
  restrict(["components/command-palette/**"], []),

  restrict(
    ["components/command-palette/core/**"],
    [
      {
        group: ["react-dom", "radix-ui", "../react/*", "../ui/*"],
        message:
          "core/ is the headless engine: pure functions and one store, no rendering. Its only React import is the `ReactNode` type on `ItemMeta.icon`.",
      },
    ]
  ),

  restrict(
    ["components/command-palette/react/**"],
    [
      {
        group: ["radix-ui", "../ui/*"],
        message:
          "react/ is bindings only — hooks and context, no markup. Anything that renders belongs in ui/.",
      },
    ]
  ),

  restrict(
    ["components/command-palette/ui/**"],
    [
      {
        group: ["radix-ui"],
        message:
          "radix-ui is quarantined to ui/dialog/, so a host that wants its own presentation can delete that one folder.",
      },
    ],
    { ignores: ["components/command-palette/ui/dialog/**"] }
  ),

  // ui/dialog/ may use radix-ui, but is still bound by `staysCopyable`.
  restrict(["components/command-palette/ui/dialog/**"], []),

  {
    files: ["app/**", "scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/command-palette/*/*",
                "@/components/command-palette/*/**",
              ],
              message:
                "Import from the palette's barrels, not its internals — `@/components/command-palette` or one of core/react/ui.",
            },
          ],
        },
      ],
    },
  },
]
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...paletteBoundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
])

export default eslintConfig
