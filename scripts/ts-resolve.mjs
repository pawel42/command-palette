// Lets `node --test` load the engine's extensionless relative imports.
// Node needs full specifiers for ESM; the project (and Turbopack) use bare
// paths, so the specifier gets the `.ts` extension added here instead of in
// every import statement.
import { registerHooks } from "node:module"

const HAS_EXTENSION = /\.[cm]?[jt]sx?$/

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !HAS_EXTENSION.test(specifier)
    ) {
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context)
        } catch {
          // Try the next shape.
        }
      }
    }

    return nextResolve(specifier, context)
  },
})
