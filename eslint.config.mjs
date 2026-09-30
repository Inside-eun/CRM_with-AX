import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // AX CRM 디자인 시스템에서 가져온 원본 JS는 스타일을 그대로 유지합니다.
  {
    files: ["src/design-system/**/*.{js,jsx}"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
