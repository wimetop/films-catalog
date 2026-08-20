# UX Contract

This project uses Ukrainian UI copy and native HTML controls styled in the shared application stylesheet.

| Capability | Canonical owner | Decision | Verification |
| --- | --- | --- | --- |
| Form | `features/auth-by-email` | `react-hook-form`, client validation, root server error | unit/typecheck + manual auth flow |
| Toast | None | Inline form status is sufficient for this small product | accessible `role="alert"` |
| CRUD | Feature-specific API and TanStack Query mutation | Stay on the current page; invalidate affected cache keys | mutation tests/manual flow |
| Scrollbar | Global browser default | No custom scrollbar | visual review |

Every invalid field exposes `aria-invalid` and is linked to an error message. Submission controls keep their place and show a pending label rather than disappearing.
