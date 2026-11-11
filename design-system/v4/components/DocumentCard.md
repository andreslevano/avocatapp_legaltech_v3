DocumentCard is one generated or uploaded document in the repository or a case: type icon, title, status, format/pages/date, actions (Ver, Descargar, more).

**Rules:** title = document type + matter; status from `status-*`; the more-menu holds Duplicar, Renombrar, Mover a caso, Eliminar (with confirmation). Below 640px actions wrap under the text.

**Replaces:** document rows in `dashboard/repositorio`, `(app)/documents`, `PurchaseHistory.tsx`.
