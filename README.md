# Loxada — Manga & Light Novel

## Department-local accounts (V1)
- Public self-registration: Reader, Author / Creator. A valid confirmed email is required for login.
- Admin-initiated invitation only: Publisher.
- Supplier creation is minimal; the supplier completes an application inside `/portal`, and the department administrator reviews it at `/admin/accounts`.
- Verified supplier application does **not** grant legal rights, publishing permission, purchasing authority, or access to protected staff/admin screens.
- No cross-department customer identity graph or role assignment from user-editable metadata. Department data and credentials are isolated.

## Existing staff login preserved
`/login` is universal for staff and customers. Only trusted, server-provisioned `public.staff_roles.role = 'dept_admin'` grants `/admin`.
`admin` remains an alias for the server-side `ADMIN_LOGIN_EMAIL` and is not a security credential.
The existing `scripts/provision-admin.mjs` workflow remains server-only.

## Environment and auth provider setup
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for department Supabase.
Set server-only `SUPABASE_SECRET_KEY` for authenticated admin invitation/review actions; **never** expose it with `NEXT_PUBLIC_`.
Set `APP_ORIGIN` to the canonical deployed origin (HTTPS, e.g. `https://your-domain.example`).
In Supabase Auth configure email confirmation and permitted redirects for `APP_ORIGIN/auth/confirm` and `APP_ORIGIN/set-password`.
If using email templates with a token hash, route them through `/auth/confirm?token_hash=...&type=...&next=/portal` (or `next=/set-password` for invitations); the handler also accepts PKCE `code` callbacks.
Invitation delivery depends on a working Supabase Auth email sender/provider configuration. Use a configured SMTP sender for production.

## Database
The database migration `v1_portal_registration_onboarding` adds `portal_accounts` and `supplier_applications` with RLS, and a limited Auth-created-account trigger.
The trigger never writes `staff_roles`. For Manga, only `creator` is a public supplier *applicant* classification; privileged supplier types are assigned only after an admin initiates an invite.
The migration was applied to this department's Supabase project on 2026-11-07.

## Run and check
Use `npm install`, `npm run lint`, `npm run build`, and test email confirmation, login routing, supplier review and invitation acceptance with real test addresses.
There are no placeholder subscriber payments, retail orders, or manuscript publications.

## Department account management
The department administrator uses /admin/accounts to search and filter customer and supplier accounts, open an individual account, edit its display name, suspend/reactivate portal access with a reason, and request password recovery by email. Changes are audited in portal_account_audit.
- Customer and supplier identities are department-local. Staff roles remain separate, server-provisioned and never editable through account management.
- Suspended users cannot open the department portal or submit or read supplier applications through the Data API. Supplier decisions are preserved by suspension.
- Recovery emails require configured Supabase Auth email delivery and permitted redirects to /set-password. Administrators never see user passwords.
- SUPABASE_SECRET_KEY stays server-only.

## Account interface and terminology (V1)
- UX identity: editorial paper-and-ink account register, author/publisher review desk, and reading account.
- Use **Reader**, **Independent author**, and **Publisher**. These are department-local account types.
- Readers access free authorized Manga/Light Novel releases once the reading features are available; do not describe it as a paid-book subscription.
- Authors self-register and complete a separate application inside their account. Publishers join through editor/admin invitations.
- Applicant verification is not permission to publish any manuscript, title, edition, or derivative work.
- The account register, detail view, signup, and publishing-application portal are intentionally styled differently from Anime and Merchandise.
