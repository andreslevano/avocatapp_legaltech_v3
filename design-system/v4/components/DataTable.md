DataTable lists records (clients, cases, documents) with sortable headers; below 640px it becomes a stacked card list.

**Consumer provides:** `caption` (visible title, also the table's name), `columns` `{key,label,sortable,sort,num,render}`, `rows`.

**Spec:** header row `surface-muted` 12/16 `text-muted`, sticky; rows 14/22 with 1px `border` dividers, hover `surface-muted`; first column is a row header (`th scope=row`). Numbers right-aligned, tabular.

**States:** loading → 5 skeleton rows; empty → `EmptyState` in the table body; error → `Alert` above the table with Retry.

**A11y:** sort buttons expose `aria-sort`; the whole row is not clickable — put the link on the first cell.

**Replaces:** `dashboard/ClientTable.tsx`, tables in `dashboard/directorio-clientes`, `dashboard/casos*`, `PurchaseHistory.tsx`.
