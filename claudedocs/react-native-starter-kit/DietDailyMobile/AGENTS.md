# Repository Guidelines

## Project Structure & Module Organization
- Keep all runtime code in `src/`; navigation lives in `src/app/RootNavigator` while feature domains (auth, dashboard, food diary, symptom diary) live under `src/features`.
- Share clients, stores, and types by colocating them in `src/shared`, and author design tokens exclusively inside `src/theme`.
- Bootstrap the app in `App.tsx` and `index.ts`. Place colocated tests beside the file or under `src/__tests__/` and store media assets inside `assets/`.
- Native platform configuration resides in `ios/`; avoid duplicating configuration elsewhere.

## Build, Test, and Development Commands
- `npm start` launches the Expo dev server with live reload.
- `npm run android` / `npm run ios` build and run the project via Expo Run on connected devices or emulators.
- `npm run web` validates responsive layouts in the Expo web runtime.
- `npx expo test` executes the Jest suite; append `--watch` while iterating locally.

## Coding Style & Naming Conventions
- Write modern TypeScript with functional React components, two-space indentation, and no semicolons.
- Name components/screens in PascalCase, hooks/utilities in camelCase, and reuse logic through `@/shared/...` imports instead of deep relatives.
- Co-locate styles with their component and source tokens from `src/theme`; prefer hooks for state management.
- Run `npx prettier --check "src/**/*.{ts,tsx}"` and `npx eslint "src/**/*.{ts,tsx}"` before committing.

## Testing Guidelines
- Tests rely on Jest and `@testing-library/react-native` with filenames ending in `.test.ts` or `.test.tsx`.
- Aim for ≥80% statement coverage and emphasize user flows over implementation detail assertions.
- Snapshots are acceptable when they capture meaningful UI changes; inspect diffs before approval.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) and keep each commit scoped to a single concern.
- Pull requests should summarize the change, link the relevant issue/task ID, attach screenshots for UI updates, and paste the latest test output.
- Request review from the owning feature area and confirm Expo build checks prior to merge.

## Security & Configuration Tips
- Expo reads configuration from `app.json`; keep secrets in untracked `.env` files and load them via environment helpers.
- Introduce backend integrations through typed clients in `src/shared/api`, and coordinate state transitions within the corresponding feature store to maintain predictable data flow.
