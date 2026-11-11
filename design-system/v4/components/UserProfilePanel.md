UserProfilePanel opens from the rail avatar: identity, plan and trial status, account links, sign out.

**Rules:** opens as a popover (desktop) / bottom sheet (mobile) with `role="dialog"`, focus trapped, Esc closes; plan line links to Suscripción; “Cerrar sesión” is last and visually separated. Language & country live here (the repo has `LanguageSelector` + 5 locales but the app exposes no switcher).

**Replaces:** `layout/UserProfilePanel.tsx`, `UserMenu.tsx`.
