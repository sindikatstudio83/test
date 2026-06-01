import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
});

const eslintConfig = [
  // Ignore compiled Next.js output
  { ignores: [".next/**", "node_modules/**", "supabase/functions/**"] },
  ...compat.config({
    extends: ["next/core-web-vitals"]
  })
];

export default eslintConfig;
