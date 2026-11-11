Card groups related content on a surface.

**Consumer provides:** `title`, `actions`, `variant` (`default` · `flat` · `accent`), `padding` (`md` 24 · `sm` 16), `href` (whole card becomes one link — never nest other links inside).

**Spec:** `surface`, 1px `border`, `radius-lg` (12), `shadow-sm` on light; dark uses border only. Title 16/24 sans 600 `text-heading`. v3 `Card` used `rounded-xl` and `.card` used `rounded-xl shadow-card` while pages used `rounded-lg` 272× — one radius now.

**Don't** add coloured left borders or nest cards more than one level.

**Replaces:** `ui/Card.tsx` (`dark`, `gold`, `elevated` variants → themes, `accent`, `shadow-md`), `.card`.
