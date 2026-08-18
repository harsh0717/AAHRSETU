# AharSetu Final Production Enhancement — Tasks

## Phase 1: Backend New Endpoints
- [x] Add comprehensive reports endpoints to backend/api/v1/endpoints/reports.py
- [x] Add PATCH /vendors/{vendor_id}/menu/{item_id}/availability endpoint
- [x] Add POST /users/bulk-deactivate admin reset endpoint
- [x] Fix principal_approval_status AttributeError in backend/services/order.py

## Phase 2: Frontend — Vendor UI
- [x] Remove Reject Order button from vendor/page.tsx
- [x] Wire Modify Request button on incoming orders tab
- [x] Enhance modification modal with item details

## Phase 3: Reports Redesign
- [x] Install Recharts
- [x] Create standalone app/admin/reports/page.tsx (full analytics dashboard)
- [x] Department expenditure with bar chart
- [x] Vendor revenue comparison chart
- [x] Order funnel visualization
- [x] Monthly trends chart
- [x] Top items table
- [x] Approval analytics
- [x] Global filters affecting all components
- [x] CSV export
- [x] Mobile responsive

## Phase 4: Sidebar Enhancement
- [x] Update AppShell.module.css with improved hover/active states
- [x] Add left border indicator for active items

## Phase 5: Admin Reset Feature
- [x] Add admin reset UI in admin/page.tsx settings tab

## Phase 6: Notification Routing
- [x] Add route field to Notification model
- [x] Update notification service to include routes

## Phase 7: TypeScript Verification
- [x] Run npx tsc --noEmit
