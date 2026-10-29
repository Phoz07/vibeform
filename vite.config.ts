import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/server/dist/**",
      "packages/db/dist/**",
      ".alchemy/**",
      ".wrangler/**",
      "**/.wrangler/**",
      "apps/web/.open-next/**",
    ],
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
  fmt: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/server/dist/**",
      "packages/db/dist/**",
      ".alchemy/**",
      ".wrangler/**",
      "**/.wrangler/**",
      "apps/web/.open-next/**",
    ],
    singleQuote: false,
    semi: true,
    sortPackageJson: true,
  },
  staged: {
    "*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
  },
});
