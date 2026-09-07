import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "_legacy/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  {
    // Everything under app/ is a Server Component unless it says "use client".
    // They render once, on the server, so the React purity rule (which assumes a
    // re-runnable client render) reports false positives on Date.now().
    files: ["src/app/**/*.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
];

export default config;
