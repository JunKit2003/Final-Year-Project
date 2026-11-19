import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["build", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Dev-only HMR hint; the icon factory and shared constants trip it without any runtime cost.
      "react-refresh/only-export-components": "off",
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },
  {
    // Legacy admin screens, carried over from CRA unchanged in behaviour. They predate the
    // React Compiler rules; refactoring their effects is tracked separately so this upgrade
    // doesn't risk the admin flows. New code must pass these rules.
    files: [
      "src/pages/Admin/**",
      "src/components/Admin/**",
      "src/components/BubbleSelector.jsx",
      "src/components/TextFieldWithCounter.jsx",
      "src/components/FilterSearch.jsx",
      "src/components/ImageUploadUI.jsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  { files: ["vite.config.js", "eslint.config.js"], languageOptions: { globals: { ...globals.node } } },
];
