# Email templates

BunPlot's auth emails, in the Classic Light look. Supabase sends them, so they live in the dashboard: paste each file into **Authentication → Emails → Templates** (the template named below), with its subject. These files are the source; edit them here first, then paste again.

| File | Dashboard template | Subject |
|---|---|---|
| `reset-password.html` | Reset password | Reset your BunPlot password |
| `password-changed.html` | Password changed (security notification) | Your BunPlot password was changed |
| `confirm-signup.html` | Confirm sign up | Confirm your email for BunPlot |
| `change-email.html` | Change email address | Confirm your new email for BunPlot |
| `magic-link.html` | Magic link | Your BunPlot login link |
| `reauthentication.html` | Reauthentication | Your BunPlot verification code |

BunPlot has no invites, so the Invite user template keeps Supabase's default.

## How the links work

Each link is `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…&next=…`. The app passes its own `/confirm` page as the return address with every request that sends one of these emails (`emailLinkReturn` in `lib/emailLinks.ts`), so a request made on localhost links back to localhost. The `/confirm` page asks the reader to press Continue, and only then verifies the token (`app/api/auth/confirm/route.ts`), so email scanners that open links early can't use them up.

An email sent from the dashboard itself (for example, **Send password recovery** on a user) has no app return address, so its link lands on the home page. Use the app's Forgot password page instead.

## Dashboard settings these rely on

- **Authentication → URL Configuration:** Site URL `https://bun-plot.vercel.app`; Redirect URLs `https://bun-plot.vercel.app/**` and `http://localhost:3000/**`. A return address not on the list falls back to the Site URL, which breaks the link.
- **Authentication → Emails → SMTP Settings:** custom SMTP on (the built-in sender only reaches the project's team).
- **Email OTP expiration:** 3600 seconds (the default). The emails say links and codes expire in an hour.
- **Security notifications:** turn on **Password changed**, or that email is never sent.
- **Password requirements:** minimum length 10, matching the app's forms.
- **Secure password change:** off. Settings checks the current password itself.

The logo is `public/brand/bunplot-email-logo.png`, loaded from `{{ .SiteURL }}`, so it shows once that file is deployed. Gmail doesn't display SVG images, hence the PNG.
