# Cookie and Session Usage Audit

This document lists all files that still use cookies or sessions after JWT migration.

## Backend Files Using Sessions/Cookies

### Critical Issues (Need to be fixed)

#### 1. `backend/routes/adminRoutes.js`
- **Lines 56-64**: Test route uses `req.session.user` and `req.sessionID`
- **Lines 909-912**: Uses `req.session.adminUser`, `req.session.admin`, `req.session.user` for admin ID
- **Lines 1055-1058**: Uses `req.session` for admin ID
- **Lines 1167-1170**: Uses `req.session` for admin ID
- **Lines 1740-1743**: Uses `req.session` for admin ID
- **Lines 2045-2051**: Uses `req.session.adminUser`, `req.session.admin`, `req.session.user`
- **Lines 3087-3090**: Uses `req.session` for admin ID
- **Lines 3166-3169**: Uses `req.session` for admin ID
- **Lines 3228-3231**: Uses `req.session` for admin ID

**Action Required**: Update all these routes to use JWT authentication via `req.user` from `authenticateJWT` middleware.

#### 2. `backend/routes/staffRoutes.js`
- **Line 560**: Uses `req.session.staffUser` for current staff ID
- **Line 886**: Uses `req.session.staffUser` for cancelledBy
- **Line 893**: Uses `req.session.staffUser` for current staff ID
- **Line 979**: Uses `req.session.staffUser` for staff ID
- **Line 1301**: Uses `req.session.staffUser` for staff ID
- **Line 1398**: Uses `req.session.staffUser.id`
- **Line 1485**: Uses `req.session.staffUser.id`
- **Line 1543**: Uses `req.session.staffUser.id`
- **Line 2628**: Uses `req.session.staffUser` and `req.session.adminUser`

**Action Required**: Update all these routes to use JWT authentication via `req.user` from `authenticateJWT` middleware.

### Acceptable Uses (Can keep for now)

#### 1. `backend/server.js`
- **Lines 267-276**: `express-session` middleware - **KEEP** (needed for Google OAuth)
- **Lines 285-322**: Session refresh middleware - **KEEP** (for Google OAuth compatibility)
- **Lines 309-318**: Admin/Staff session refresh - **REMOVE** (no longer needed for JWT)

#### 2. `backend/routes/authRoutes.js`
- **Lines 53-62**: Google OAuth uses `req.session.postLoginRedirect` and `req.session.tableNumber` - **KEEP** (OAuth flow requires sessions)
- **Lines 116-147**: Google OAuth callback uses `req.session.customerUser` - **KEEP** (OAuth flow)

**Note**: Google OAuth requires sessions for the OAuth flow. This is acceptable and should remain.

### Logging/Reference Only (Can keep)

#### 1. `backend/controllers/adminController.js`
- **Line 42**: Logs cookies (reference only)
- **Line 207**: Logs cookies (reference only)
- **Line 349**: Logs `req.session.user` (reference only)
- **Line 412**: Logs `req.session.user` (reference only)

#### 2. `backend/controllers/customerController.js`
- **Line 13**: Logs cookies (reference only)
- **Line 62**: Comment about JWT-only (no action needed)

## Frontend Files Using `credentials: 'include'`

### Files That Should Be Updated to Use `axiosInstance`

All these files use `credentials: 'include'` in fetch calls. While this doesn't break anything, they should be updated to use `axiosInstance` for consistency:

1. `frontend/src/components/customer/AuthContext.tsx` - 4 instances
2. `frontend/src/components/customer/CustomerOrders.tsx` - 5 instances
3. `frontend/src/components/customer/CustomerDasboard.tsx` - 5 instances
4. `frontend/src/components/auth/ProtectedRoute.tsx` - 2 instances
5. `frontend/src/utils/apiClient.ts` - 1 instance
6. `frontend/src/components/customer/CustomerLayoutInner.tsx` - 1 instance
7. `frontend/src/components/ui/signup-form.tsx` - 1 instance
8. `frontend/src/components/customer/GuestOrderTracking.tsx` - 1 instance
9. `frontend/src/components/customer/CustomerFeedback.tsx` - 3 instances
10. `frontend/src/components/admin/AdminDashboard.tsx` - 5 instances
11. `frontend/src/components/staff/StaffDashboard.tsx` - 5 instances
12. `frontend/src/components/customer/CustomerLoyalty.tsx` - 5 instances
13. `frontend/src/components/staff/StaffSidebar.tsx` - 1 instance
14. `frontend/src/components/admin/AdminSidebar.tsx` - 1 instance
15. `frontend/src/components/customer/CustomerMenu.tsx` - 5 instances
16. `frontend/src/components/customer/GuestOrderForm.tsx` - 1 instance
17. `frontend/src/components/POS/PaymentProcessor.tsx` - 1 instance
18. `frontend/src/components/staff/StaffSales.tsx` - 3 instances
19. `frontend/src/components/staff/StaffLoyalty.tsx` - 1 instance
20. `frontend/src/components/admin/AdminActivityLogs.tsx` - 2 instances
21. `frontend/src/components/admin/AdminFeedback.tsx` - 3 instances
22. `frontend/src/components/admin/AdminSales.tsx` - 6 instances
23. `frontend/src/components/admin/AdminTransactionHistory.tsx` - 3 instances
24. `frontend/src/components/admin/AdminEvents.tsx` - 1 instance
25. `frontend/src/components/staff/StaffOrders.tsx` - 3 instances
26. `frontend/src/components/admin/AdminMenu.tsx` - 4 instances
27. `frontend/src/components/admin/EnhancedInventory.tsx` - 6 instances
28. `frontend/src/components/admin/AdminOrders.tsx` - 4 instances
29. `frontend/src/components/POS/SimplePOS.tsx` - 2 instances
30. `frontend/src/components/customer/CustomerOrderTracking.tsx` - 2 instances
31. `frontend/src/components/staff/StaffRewardProcessing.tsx` - 3 instances
32. `frontend/src/pages/StaffPasswordVerification.tsx` - 1 instance
33. `frontend/src/pages/CustomerPasswordVerification.tsx` - 1 instance
34. `frontend/src/pages/CustomerEmailVerification.tsx` - 2 instances
35. `frontend/src/pages/AdminPasswordVerification.tsx` - 1 instance
36. `frontend/src/contexts/AlertContext.tsx` - 2 instances
37. `frontend/src/components/staff/StaffSettings.tsx` - 2 instances
38. `frontend/src/components/staff/StaffPOS.tsx` - 3 instances
39. `frontend/src/components/staff/StaffInventory.tsx` - 1 instance
40. `frontend/src/components/customer/UnifiedCustomizeModal.tsx` - 3 instances
41. `frontend/src/components/customer/CustomerSettings.tsx` - 3 instances
42. `frontend/src/components/customer/CustomerEventForm.tsx` - 3 instances
43. `frontend/src/components/customer/CustomerDashboardNavbar.tsx` - 3 instances
44. `frontend/src/components/customer/AIChatbot.tsx` - 5 instances
45. `frontend/src/components/admin/ProductDetailsForm.tsx` - 1 instance
46. `frontend/src/components/admin/AdminSettings.tsx` - 4 instances
47. `frontend/src/components/admin/AdminLoyaltySettings.tsx` - 3 instances

**Total**: ~147 instances of `credentials: 'include'` that should be migrated to `axiosInstance`

## Summary

### Critical Issues (Must Fix)
1. **Admin routes** - ~10 routes still use `req.session` instead of JWT
2. **Staff routes** - ~9 routes still use `req.session` instead of JWT
3. **Server middleware** - Admin/Staff session refresh should be removed

### Acceptable Uses (Keep)
1. **Google OAuth** - Requires sessions for OAuth flow
2. **express-session middleware** - Needed for Google OAuth

### Recommended Updates (Not Critical)
1. **Frontend fetch calls** - Migrate ~147 instances to use `axiosInstance` for consistency

## Priority Actions

1. **HIGH**: Update admin routes to use JWT (`req.user` from `authenticateJWT`)
2. **HIGH**: Update staff routes to use JWT (`req.user` from `authenticateJWT`)
3. **MEDIUM**: Remove admin/staff session refresh from server.js
4. **LOW**: Migrate frontend fetch calls to axiosInstance (can be done gradually)



