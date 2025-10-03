# Repository Guidelines

## Project Structure & Module Organization
Source files live in `src/`, with `src/app` owning navigation (`RootNavigator`) and `src/features` split by domain (auth, dashboard, food diary, symptom diary). Shared clients, stores, and types sit under `src/shared`, while design tokens belong in `src/theme`. Global bootstrap logic stays in `App.tsx` and `index.ts`. Co-locate tests beside the subject or under `src/__tests__/`, and keep static media in `assets/` with platform configs inside `ios/`.

## Build, Test, and Development Commands
Run `npm start` to launch the Expo dev server with live reload. Use `npm run android` or `npm run ios` for device builds via Expo Run. Validate responsive layouts with `npm run web`. Execute suites through `npx expo test` (append `--watch` while iterating). Household formatting checks run with `npx prettier --check "src/**/*.{ts,tsx}"` and lint with `npx eslint "src/**/*.{ts,tsx}"`.

## Coding Style & Naming Conventions
Write modern TypeScript with functional React components. Use 2-space indentation, avoid semicolons, and favor hooks for state. Name components and screens in `PascalCase`, hooks and helpers in `camelCase`, and share utilities through `@/shared/...` aliases instead of deep relatives. Style definitions should live alongside their component and pull tokens from `src/theme`.

## Testing Guidelines
Tests rely on Jest with `@testing-library/react-native`. Name files `*.test.tsx` or `*.test.ts`. Target at least 80% statement coverage and focus on user flows, not implementation details. Snapshots are acceptable when they capture meaningful UI changes—review updates before committing.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) and scope each commit to a single concern. Pull requests should summarize changes, link the relevant issue or task ID, attach screenshots for UI updates, and include the latest test output. Request review from the owning feature area, resolve feedback promptly, and confirm Expo build checks before merging.

## Environment & Configuration Notes
Expo reads configuration from `app.json`; keep secrets in untracked `.env` files. Add new backend integrations through typed clients in `src/shared/api`, and manage state transitions within the appropriate feature store to maintain predictable data flow.
