---
title: "Opti ID & the Admin Center — Adding Projects and Granting Access"
tags:
  - optimizely
  - cms
  - opti-id
  - admin-center
  - sso
---

**Opti ID** is Optimizely's single sign-on and identity layer. The **Admin Center** (at [login.optimizely.com](https://login.optimizely.com/)) is where you manage users, groups, roles, and product access for every Opti-ID-enabled product in one place. This page covers how to onboard a project/instance and how to get people access — including the two things that block teams most often.

> [!warning] Gotcha: the PaaS Portal is not (yet) tied into Opti ID
> Access to the **PaaS Portal** (paasportal.episerver.net) is **not** supported by Opti ID. You still manage PaaS Portal access the old way. The *other* products attached to your account — CMS SaaS, DAM, Opal, OCP, Experimentation, ODP, etc. — **are** supported and are managed through the Admin Center. Don't expect to see or manage the DXP PaaS project itself as an Opti ID "product."

## What runs on Opti ID

Opti ID is required for the cloud services and is the SSO/MFA front door for CMS editors and business users. It does **not** touch your public site's authentication — front-end visitors keep whatever auth you already use.

| Requires Opti ID | Not on Opti ID |
|---|---|
| DAM (cloud-only) | PaaS Portal / DXP project management |
| Opal | Public-facing site users (your own auth) |
| OCP (Optimizely Connect Platform) | On-premises CMS |
| GEO Analytics | |
| CMS SaaS, Experimentation, ODP, Commerce Connect, PIM | |

Related: [[optimizely-opal|Opal install]] and [[dam-integration|DAM integration]] both depend on the Admin Center connection described here.

## Admin Center structure

After login, admins land on the most relevant page for their role. The core areas:

| Page | What it does |
|---|---|
| **Users** | Invite, view, edit, and remove users across the whole organization. Requires **Super Admin**. |
| **Product Access** | Alternative view of the same users, scoped by product/instance. |
| **Groups** | Bundle users + product/role assignments so access is granted in one shot. |
| **Roles** | Define and manage roles and permissions. |
| **Product** | The per-product / per-instance settings, including the **Details** tab where the Technical Contact is set. |
| **Usage & Billing** | Consolidated dashboards (Billing Admin). |
| **Settings** | SSO configuration (Settings Admin). |
| **Activity Log** | Login and account-change audit trail. |

**Products vs. instances vs. projects:** a *product* (e.g. CMS SaaS, Experimentation) can have multiple *instances*, and Experimentation adds a further *project* level. Roles are assigned at the level that applies — product, instance, or project.

## Roles: Admin Center roles ≠ product roles

This trips people up. There are two independent tiers:

- **Admin Center roles** control what you can do *inside the Admin Center itself*. Think of them as product roles where the product is "Opti ID Admin Center."
- **Product roles** control what a user can do *inside a given Optimizely product/instance* (e.g. CMS editor vs. admin).

Admin Center roles:

| Role | Scope |
|---|---|
| **Super Admin** | Everything in the Admin Center, including creating custom roles and managing the **Users** page. Any other role added alongside Super Admin doesn't narrow it — to restrict a Super Admin you must remove the role entirely. |
| **Billing Admin** | Usage & Billing page only. |
| **Settings Admin** | Settings page (SSO) only. |

## Onboarding: technical contact first, then everyone else

Getting a new organization/instance live in the Admin Center follows a fixed order. You can't shortcut it — access flows down from the technical contact.

### 1. The technical contact activates the account

The **technical contact** is the primary administrator and the *first* official Opti ID user with Admin Center access. Their first login:

1. Open the **"Welcome to Optimizely!"** email → click **Get Started**.
2. Accept the invitation.
3. Open the Okta **activation** email → **Activate Optimizely Account**.
4. Set a password.
5. Log in at [login.optimizely.com](https://login.optimizely.com/).

> [!tip] Allowlist these before you start
> To avoid the invite/activation emails getting filtered, allowlist `noreply@optimizely.com` and `noreply@login.optimizely.com`.

### 2. Choose the login model

Configure the org for **local login**, **SSO without SCIM**, or **SSO with SCIM**. Opti ID supports up to five SSO connections (SAML or OpenID Connect) via providers like Entra ID, Okta, Google, OneLogin, PingOne, and Duo, plus MFA on both local and SSO logins.

### 3. Invite users and grant product access

From **Users → Invite User** (Super Admin required):

1. Enter the user's **email**.
2. **Add Product Access** — pick the **Product**, **Instance**, and **Role**, then click the checkmark to save. Repeat for each product/instance.
3. Optionally **Add Group Access** to drop them into an existing group instead.

To change who owns an instance: **Admin Center → Product**, select the product + instance, **Details** tab → **Edit**, then search and select the new **Technical Contact**.

## Field note: the Super-Admin invitation deadlock

The most common real-world blocker isn't technical — it's the invitation chain stalling:

- Optimizely designates a **Super Admin** for the account. Until that person clicks through the Welcome + activation emails, **no one has Admin Center access** and no one else can be granted it.
- Support **won't** add other admins (including you) on request — they need the **OK of the technical contacts** on record first.

If you're locked out, the fix is a person, not a ticket: get the named Super Admin to accept their invitation (check spam / allowlist the two addresses above), or have a technical contact authorize the change with Optimizely Support / your CSM. If the Super Admin is unreachable, the technical contact can request the designation be moved.

## Sources

- [Overview of Opti ID](https://support.optimizely.com/hc/en-us/articles/32694161850381-Overview-of-Opti-ID) — Optimizely Support (accessed 2026-07-23)
- [Opti ID category](https://support.optimizely.com/hc/en-us/categories/25425385971469-Opti-ID) — Optimizely Support
- [Overview of the Opti ID Admin Center](https://support.optimizely.com/hc/en-us/articles/25450783599117-Overview-of-the-Opti-ID-Admin-Center)
- [Initial technical contact login](https://support.optimizely.com/hc/en-us/articles/20365275281165-Initial-technical-contact-login)
- [Roles and permissions](https://support.optimizely.com/hc/en-us/articles/15858154659853-Roles-and-permissions)
- [Manage users](https://support.optimizely.com/hc/en-us/articles/15858067637389-Manage-users)
- Optimizely Support email thread re: connecting a project to Opti ID / Admin Center (2026-07)
