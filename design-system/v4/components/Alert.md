Alert is an inline message about the current context; `banner` spans the page top.

**Consumer provides:** `tone` (`info` · `success` · `warning` · `danger` · `accent`), `title`, `children`, `action`, `dismissible`, `banner`.

**Rules:** icon + title carry the tone (not colour alone); body text stays `text` on the `*-subtle` ground (≥ 4.5:1 checked in both themes); errors explain what happened, whether money was charged, and what to do next. ErrorSummary for forms is a `danger` Alert listing linked errors.
