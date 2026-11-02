# ZIM CARS - Technical Audit Report

**Date:** 2025-11-02  
**Auditor:** AI Agent  
**Project:** Zim Cars (car-attribution-platform)  
**Live URL:** https://zim-cars.vercel.app  
**Repo:** https://github.com/riskykyng-oss/zim-cars

---

## Executive Summary

Zim Cars is a lead-attribution focused marketplace for Zimbabwe with the core premise of tracking enquiries, managing dealer commissions, and enforcing dealer verification. The foundation is in place - authentication, dealer onboarding, vehicle inventory, lead creation, sales/commission tracking, payments - but there are gaps between the ambitious spec in the master prompt and current implementation.

**Overall Status:** Functional MVP with solid attribution basics, but missing many of the advanced features specified (comprehensive analytics, appointment tracking, campaign management, disputes, etc.)

---

## 1. Architecture & Stack

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (React 19, Vite, Tailwind) | ✅ Working | Clean component structure, mobile responsive |
| Backend (Express, Node.js) | ✅ Working | REST API, session auth, modular routes |
| Database (Postgres/Supabase + Prisma) | ✅ Working | Schema exists, migrations applied |
| Storage (Supabase Storage) | ✅ Working | For images, docs, dealer assets |
| Hosting (Vercel) | ✅ Working | Single project deployment working |
| Sessions (Postgres store) | ✅ Working | Configured in `server/src/config/session.js` |

---

## 2. Authentication & Authorization

| Feature | Status | Notes |
|---------|--------|-------|
| Session-based auth | ✅ Implemented | Uses express-session with Postgres store |
| Role-based access (admin, dealer_owner, dealer_staff) | ✅ Implemented | Roles in User model |
| Protected routes (frontend) | ✅ Implemented | ProtectedRoute component checks roles |
| Backend role middleware | ⚠️ Partial | `requireRole` and `requireAuth` exist; `requireDealerAccess` exists but not consistently used |
| Dealer data isolation | ⚠️ Partial | Enforced in some controllers (leads, sales, vehicles) but not systematically across all endpoints |
| Password hashing | ✅ Implemented | Using bcryptjs (seen in auth controller) |
| Secure cookies | ✅ Configured | trust proxy set for Vercel, secure in production via session config |

**Issues:**
- Some endpoints rely only on frontend checks
- No CSRF protection visible
- Dealer staff vs owner permissions not differentiated beyond role check
- No password reset/change functionality visible

---

## 3. Dealer Management & Verification

| Feature | Status | Notes |
|---------|--------|-------|
| Dealer registration | ✅ Implemented | `/become-a-dealer` with terms checkbox |
| Verification document upload (ID/Passport + Proof of Address) | ✅ Implemented | Supports PDF/images, stored in Supabase |
| Admin verification workflow (approve/reject) | ✅ Implemented | Admin can approve/reject with reason |
| Dealer onboarding checklist | ✅ Implemented | Shows progress in dealer dashboard |
| Dealer profile customization (logo, cover, description, location, address) | ✅ Implemented | Recently added |
| Dealer stories (24hr) | ✅ Implemented | Recently added with expiration |
| Public dealer portfolio pages | ✅ Implemented | `/dealers/:slug` with catalog, stories, branding |
| Verification statuses | ⚠️ Partial | Statuses exist in schema but lifecycle not fully enforced |
| Document access control | ⚠️ Unknown | Need to check if documents are private/signed URLs |
| Dealer suspension/reactivation | ❌ Not visible | No suspend functionality in admin UI |

**Issues:**
- Verification can be approved but enforcement of "must be verified to publish" not consistently enforced
- No resubmission flow clearly visible
- Document viewing in admin - need to check if using signed URLs

---

## 4. Vehicle Inventory

| Feature | Status | Notes |
|---------|--------|-------|
| Add/edit vehicles | ✅ Implemented | Dealer can CRUD their vehicles |
| Multi-image upload (up to 10) | ✅ Implemented | Recently added |
| Publish/unpublish | ✅ Implemented | Requires images to publish |
| Vehicle status (available, unpublished, sold) | ✅ Implemented | |
| Public vehicle listing with filters | ✅ Implemented | make, price, year, transmission, dutyPaid |
| Vehicle detail page | ✅ Implemented | With WhatsApp enquiry |
| Dealer gating for public visibility | ✅ Implemented | Only eligible dealers (active/trial not expired) shown |
| Vehicle verification/review | ❌ Not implemented | No admin review of listings |
| Duplicate detection | ❌ Not implemented | |
| Availability confirmation/staleness warnings | ❌ Not implemented | |
| Listing history/audit | ⚠️ Partial | Some audit logs exist |

**Issues:**
- No admin moderation of vehicle content
- No way to flag/reject listings
- Sold vehicles remain in DB but filtered from public view

---

## 5. Lead Attribution Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Lead creation on enquiry | ✅ Implemented | Creates lead with vehicle/dealer/referral |
| Unique lead ID (short) | ✅ Implemented | Format `L-XXXXXX` |
| Referral code tracking | ✅ Implemented | Captured from URL params, validated |
| Source tracking | ⚠️ Partial | Limited sources (web, whatsapp, phone, walkin, qr) vs spec |
| Lead deduplication (30-day window) | ✅ Implemented | Same phone+vehicle within 30 days returns existing |
| Lead lifecycle statuses | ⚠️ Partial | Only `new, contacted, sold, lost` vs full spec |
| Lead event history | ✅ Implemented | LeadEvent model exists, created on create/update |
| Audit logging | ✅ Implemented | AuditLog for lead create/update |
| Campaign tracking | ❌ Not implemented | No campaign IDs/attribution beyond referral codes |
| Offline/walk-in lead recording | ❌ Not implemented | No UI for manual lead entry |
| Duplicate flagging for review | ❌ Not implemented | Just deduplicates silently |
| IP/userAgent/pageUrl capture | ✅ Implemented | Captured on lead creation |

**Issues:**
- Lead statuses don't match full spec (missing viewing arranged/completed, negotiation, duplicate, invalid, disputed)
- No way to assign leads to specific staff
- No appointment/viewing tracking
- Referral codes validated but no campaign management
- Google Sheets integration exists (postToGoogleSheet) - external dependency

---

## 6. WhatsApp Integration

| Feature | Status | Notes |
|---------|--------|-------|
| WhatsApp enquiry button | ✅ Implemented | On vehicle detail page |
| Generate WhatsApp link with message | ✅ Implemented | `/leads/whatsapp/:vehicleId` |
| Include vehicle details + ref + lead ID in message | ✅ Implemented | |
| Mobile sticky button | ✅ Implemented | |
| Track lead before redirecting | ✅ Implemented | Creates lead first, then gets WhatsApp link |
| Official WhatsApp Business API | ❌ Not implemented | Just wa.me links |

---

## 7. Sales & Commission Management

| Feature | Status | Notes |
|---------|--------|-------|
| Dealer can mark lead as sold | ✅ Implemented | Via createSale endpoint |
| Commission calculation (3% default) | ✅ Implemented | Stored at time of sale (commissionRate, commissionAmount) |
| Commission only for platform leads with referralCode | ✅ Implemented | Enforced in createSale |
| Sale status (pending/confirmed/completed) | ✅ Implemented | |
| Admin can confirm sales | ✅ Implemented | |
| Commission ledger | ⚠️ Partial | Sales model tracks commission, CommissionPayment tracks payments |
| Commission reconciliation | ⚠️ Partial | Admin can record payments but UI/workflow limited |
| Prevent duplicate sales per lead | ✅ Implemented | Checks if lead.sale exists |
| Store commission rate at time of sale | ✅ Implemented | Yes |
| Outstanding/paid balances | ⚠️ Partial | Calculated in admin dashboard but not fully tracked |
| Disputes/adjustments/waivers | ❌ Not implemented | |
| Evidence upload for sales | ❌ Not implemented | |

**Issues:**
- Dealers can create sales but only if lead has referralCode (platform lead) - correct per spec
- Admin confirmation exists but dealers might not be able to submit sales properly? Let me check UI
- No evidence attachment for sales
- No dispute workflow

---

## 8. Payments & Subscriptions

| Feature | Status | Notes |
|---------|--------|-------|
| Manual EcoCash/InnBucks/OneMoney payments | ✅ Implemented | |
| Payment submission with proof upload | ✅ Implemented | |
| Admin approve/reject payments | ✅ Implemented | |
| Payment types (joining, subscription) | ✅ Implemented | |
| Pricing: $3 joining, $2/month subscription, 2-month trial | ✅ Implemented | Configured in logic/UI |
| Trial/subscription expiry tracking | ✅ Implemented | Displayed in dealer dashboard with warnings |
| Auto-activate on payment approval | ✅ Implemented | Updates dealer status/plan/subscription dates |
| Payment history | ✅ Implemented | For dealers and admin |
| Configurable pricing | ❌ Not implemented | Hardcoded in places |
| Duplicate payment prevention | ⚠️ Unknown | Need to check |
| Transaction reference validation | ⚠️ Minimal | Just stored |

**Issues:**
- Subscription extended by 1 month on approval (see payments controller?) - let me check
- No proper subscription plan management
- No outstanding balance tracking beyond what's shown

---

## 9. Dashboards

### Dealer Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Overview tabs (vehicles, leads, sales, stories, verification) | ✅ Implemented | |
| Vehicle management | ✅ Implemented | Add/edit/upload images/publish |
| Lead management | ✅ Implemented | View leads, update status, mark sold |
| Sales tracking | ✅ Implemented | Shows sales with commission |
| Company profile customization | ✅ Implemented | Recently added |
| Stories management | ✅ Implemented | Create/delete stories |
| Verification & payments tab | ✅ Implemented | Upload docs, submit payments |
| Onboarding checklist | ✅ Implemented | |
| Public page link copy | ✅ Implemented | |
| Trial/subscription warnings | ✅ Implemented | |
| Lead analytics/conversion rates | ❌ Not implemented | |
| Appointment/viewing tracking | ❌ Not implemented | |
| Campaign link generator | ❌ Not implemented | |
| QR codes | ❌ Not implemented | |

### Admin Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Overview with commission summary | ✅ Implemented | |
| Dealer verification management | ✅ Implemented | View docs, approve/reject |
| Dealer payments management | ✅ Implemented | Approve/reject with notes |
| Sales & referrals tracking | ✅ Implemented | Filter by ref/dealer/status, export CSV |
| Commission by referral code | ✅ Implemented | |
| QR codes per vehicle | ✅ Implemented | |
| Payment history | ✅ Implemented | |
| Lead management | ⚠️ Partial | Leads fetched but no dedicated lead management UI visible |
| Vehicle moderation | ❌ Not implemented | |
| Disputes/investigations | ❌ Not implemented | |
| Audit logs viewer | ❌ Not implemented | |
| Suspension/reactivation | ❌ Not implemented | |
| Advanced analytics | ❌ Not implemented | |

---

## 10. Marketplace & Buyer Features

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage | ✅ Implemented | Hero, search, featured cars, dealer section |
| Marketplace with filters | ✅ Implemented | |
| Vehicle detail page | ✅ Implemented | |
| Dealer portfolio pages | ✅ Implemented | Recently enhanced |
| Favourites/wishlist | ❌ Not implemented | |
| Recently viewed | ❌ Not implemented | |
| Vehicle comparison | ❌ Not implemented | |
| Price alerts | ❌ Not implemented | |
| Report listing | ❌ Not implemented | |
| Similar vehicles | ❌ Not implemented | |
| SEO meta tags | ⚠️ Unknown | Need to check |

---

## 11. Security & Compliance

| Feature | Status | Notes |
|---------|--------|-------|
| Role-based access control | ✅ Implemented | |
| Dealer data isolation | ⚠️ Partial | Inconsistent across endpoints |
| Password hashing (bcrypt) | ✅ Implemented | |
| Session security | ✅ Implemented | HttpOnly, SameSite=Lax, Secure in prod |
| Rate limiting | ✅ Implemented | API, login, registration, leads |
| File upload validation | ✅ Implemented | Type/size checks in middleware |
| Input validation | ⚠️ Partial | Some validation exists, not comprehensive |
| CSRF protection | ❌ Not visible | |
| SQL injection protection | ✅ Implemented | Using Prisma ORM |
| XSS protection | ⚠️ Partial | Helmet configured, CSP disabled |
| Private document storage | ⚠️ Unknown | Need to check Supabase bucket policies |
| Audit logging | ✅ Implemented | For key actions |
| Secrets in env vars | ✅ Implemented | |
| Error handling | ⚠️ Partial | Central error handler exists but some errors swallowed |

---

## 12. Critical Issues Found

### High Priority
1. **Commission enforcement gap** - In createSale, commission only allowed if lead has referralCode. But dealers can mark leads as sold via updateLead (status change) without going through createSale? Let me check - in DealerDashboard when marking sold they call `api.post('/sales', { leadId: lead.id, salePrice: price })` which goes to createSale. So they must use createSale. That's good.
2. **Dealer can access other dealers' data?** Need to audit more endpoints. Vehicles controller checks dealerId for non-admin. Leads checked. Sales checked. Seems okay but need thorough review.
3. **Admin can approve payments and activate dealers** - implemented in payments controller approve endpoint.
4. **Document security** - Verification docs uploaded to Supabase. Are they in public bucket? Need to check config.
5. **No lead assignment to staff** - schema doesn't have LeadAssignment or assigned user properly used

### Medium Priority
1. **Lead statuses incomplete** - Missing viewing/negotiation/disputed states
2. **No appointment tracking** - Mentioned in spec heavily
3. **Campaign tracking missing** - Only basic referral codes
4. **No dispute resolution workflow**
5. **Analytics very basic**
6. **No favourites/comparison/recently viewed**

### Low Priority
1. **Google Sheets integration** - External dependency, could fail silently
2. **No email notifications** - Only in-app/basic
3. **No CSV exports for dealers**
4. **QR codes only for admin**

---

## 13. What Works Well

- **Solid foundation**: Auth, roles, dealer onboarding, vehicle CRUD all functional
- **Lead attribution basics**: Creates leads on enquiry, tracks referral codes, deduplicates
- **Commission logic**: Correctly enforces platform-lead-only commission
- **Payment flow**: Manual payments working end-to-end
- **Dealer profiles**: Recently added and looking good
- **Public pages**: Dealer portfolios and marketplace functional
- **Vercel deployment**: Working smoothly
- **Mobile responsive**: Good mobile UX
- **Audit trails**: AuditLog and LeadEvent models exist

---

## 14. Recommendations

### Immediate (Phase 1 fixes)
1. **Audit all endpoints for data isolation** - Ensure dealers can't access other dealers' data
2. **Secure verification documents** - Check if using private bucket with signed URLs
3. **Complete lead lifecycle** - Add missing statuses and event tracking
4. **Add appointment/viewing tracking** - Critical for sales pipeline
5. **Improve admin lead management UI**

### Short-term (Phases 2-3)
1. **Campaign management** - Extend referral system to proper campaigns
2. **Sales evidence upload** - Allow dealers to attach proof when submitting sales
3. **Dispute workflow** - Basic dispute flagging and resolution
4. **Enhanced analytics** - Conversion rates, response times
5. **Listing moderation** - Admin can review/reject listings

### Long-term (Phases 4-7)
1. **Buyer features** - Favourites, comparison, recently viewed
2. **Advanced marketing** - QR for dealers, better campaign tools
3. **Notifications system** - In-app + email
4. **Multi-staff permissions** - Beyond just owner/staff roles
5. **Financial reporting** - Better reconciliation tools

---

## Next Steps

I need to start with **Phase 1** of the roadmap from the master prompt - audit and foundation. I've done a high-level audit. Now I need to:
1. Deep dive into specific areas with issues
2. Create a prioritized implementation plan
3. Start fixing critical security/data isolation issues
4. Improve lead attribution engine
5. Enhance sales/commission workflow

Let me examine a few more critical files - payments controller, commissions controller, vehicles controller fully, etc.
