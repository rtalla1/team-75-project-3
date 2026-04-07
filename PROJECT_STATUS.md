# Taro Root - Boba Shop Platform - Project Status

## Project Overview

**Taro Root** is a full-stack web platform designed for a hypothetical boba tea shop. It serves as a multi-role system supporting:
- **Customers**: Browse menu, customize drinks, and place orders via kiosk/online
- **Cashiers**: Process orders and manage payment
- **Managers**: Monitor operations, view analytics, and manage inventory
- **Employees**: Google-based authentication system with role-based access

The application is built with **Next.js 16.2**, **React 19**, **TypeScript**, **Tailwind CSS**, **NextAuth v5**, and **PostgreSQL**, deployed on Render.

---

## Current Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Next.js 16.2, Tailwind CSS 4, TypeScript |
| **Backend** | Next.js API Routes |
| **Authentication** | NextAuth v5 (Google OAuth) |
| **Database** | PostgreSQL (TAMU CSCE 315 DB) |
| **Styling** | Tailwind CSS with custom color theme (brand colors: purple #8b6aae) |
| **Deployment** | Render |

---

## Implemented Features

### ✅ Authentication System (COMPLETE)
- **Google OAuth Integration**: Employees can sign in with their Google accounts
- **Role-Based Access Control**: 
  - Redirects to manager dashboard if role = "manager"
  - Redirects to cashier terminal if role = "cashier"
  - Blocks access to employees not registered in database
- **JWT Token Management**: Employee ID, name, and role stored in session tokens
- **Protected Routes**: Role verification on server-side for dashboard pages

**Files**: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts`

### ✅ Database Connection (COMPLETE)
- PostgreSQL connection pool configured with SSL
- Connection to TAMU CSCE 315 team database
- Environment variable support for configuration

**Files**: `lib/db.ts`

### ✅ Menu System (MOSTLY COMPLETE)
- **API Endpoint**: `GET /api/menu` - fetches all menu items or filters by category
- **Categories Supported**: "Classic Drink", "Fruit Drink", "Food", "Add-on"
- **Database Queries**: Full menu retrieval and category-based filtering
- **Menu Data Structure**: `itemid`, `itemname`, `category`, `price`, `description`

**Files**: `lib/queries/menu.ts`, `app/api/menu/route.ts`

### ✅ Customer Order Placement Page (MOSTLY COMPLETE)
- **Full UI Implementation**:
  - Browse menu items by category (tabs for Classic Drink, Fruit Drink, Food)
  - Click items to add to cart
  - Modal customization interface for drinks (add-ons selection)
  - Shopping cart display with real-time total calculation
  - Checkout functionality
- **Features**:
  - Add-ons system for drinks (extra toppings, syrups, etc.)
  - Cart management (items display with prices and add-ons)
  - Order confirmation flow
  - "New Order" button after successful placement
- **Data Flow**: Fetches menu on component mount, allows dynamic add-ons selection, submits to backend

**Files**: `app/(customer)/order/page.tsx`

### ✅ Orders API (MOSTLY COMPLETE)
- **Endpoint**: `POST /api/orders`
- **Accepts**: Items array, total price, source (kiosk/web), customer name, employee ID
- **Validation**: Ensures items array is non-empty
- **Database Operation**: Inserts order with UUID, timestamp, order details (JSON), status (pending)
- **Returns**: Order ID for confirmation

**Files**: `lib/queries/orders.ts`, `app/api/orders/route.ts`

### ✅ Portal/Home Page (COMPLETE)
- Landing page with "Taro Root" branding
- "Order from our Menu" button linking to customer order page
- "Employee Login" footer link for staff access
- Clean, branded UI with custom color scheme

**Files**: `app/(portal)/page.tsx`

### ✅ Employee Login Page (COMPLETE)
- Dedicated login interface with brand styling
- Google OAuth sign-in button
- Error messaging for non-registered employees
- Redirects authenticated users to appropriate dashboard

**Files**: `app/login/page.tsx`

### ✅ Styling & Theme (COMPLETE)
- **Color Scheme**: 
  - Primary: #8b6aae (purple)
  - Secondary: #6b4e8b (dark purple)
  - Light variant: #f0eaf6
  - Background: #faf8fc
  - Text: #2d2235
- **Typography**: Mona Sans (body), Oranienbaum (display)
- **Framework**: Tailwind CSS v4 with custom theme tokens
- **Responsive**: Mobile-first design approach

**Files**: `app/globals.css`, `tailwind.config.mjs`, `postcss.config.mjs`

---

## Partially Implemented / Stubbed Features

### ⚠️ Cashier Terminal (SKELETON)
- **Status**: Placeholder only
- **Current**: Single heading "Cashier Terminal", route-protected to cashier role
- **Missing**:
  - Order queue/display system
  - Order status management interface
  - Payment processing UI
  - Print receipt functionality
  - Real-time order updates from other cashiers
  - Search/filter orders functionality

**Files**: `app/(cashier)/cashier/page.tsx`

### ⚠️ Manager Dashboard (SKELETON)
- **Status**: Placeholder only
- **Current**: Single heading "Manager Dashboard", route-protected to manager role
- **Missing**:
  - Sales analytics/reporting
  - Inventory management
  - Employee schedule/time tracking
  - Menu management interface
  - Order history/archives
  - System configuration
  - Performance metrics/KPIs

**Files**: `app/(manager)/manager/page.tsx`

---

## Not Yet Implemented Features

### ❌ Order Management System
- [ ] Real-time order status tracking
- [ ] Order history retrieval by customer/date range
- [ ] Order filtering and search
- [ ] Update order status (pending → preparing → ready → completed)
- [ ] Order modification/cancellation system
- [ ] Order receipt generation/printing

### ❌ Customer Account System
- [ ] Customer registration/login (separate from employee system)
- [ ] Customer order history viewing
- [ ] Saved preferences/favorites
- [ ] Loyalty/rewards program
- [ ] Order tracking with notifications

### ❌ Payment Processing
- [ ] Payment gateway integration (Stripe, Square, etc.)
- [ ] Multiple payment methods (credit card, mobile pay, etc.)
- [ ] Transaction logging
- [ ] Refund handling
- [ ] Tax calculation

### ❌ Menu Management
- [ ] Admin interface to add/edit/delete menu items
- [ ] Price management
- [ ] Category management
- [ ] Item availability toggling (out of stock feature)
- [ ] Special/seasonal items
- [ ] Menu versioning/history

### ❌ Inventory Management
- [ ] Ingredient tracking
- [ ] Stock level alerts
- [ ] Supplier management
- [ ] Inventory adjustments
- [ ] Usage analytics by item

### ❌ Employee Management
- [ ] Employee roster/directory
- [ ] Role assignment interface
- [ ] Shift scheduling
- [ ] Employee performance metrics
- [ ] Time tracking/clock in-out

### ❌ Analytics & Reporting
- [ ] Sales reports (daily, weekly, monthly)
- [ ] Popular items tracking
- [ ] Revenue analytics
- [ ] Peak hours analysis
- [ ] Employee performance reports
- [ ] Inventory usage reports

### ❌ Customer Experience Features
- [ ] Customer feedback/ratings
- [ ] Online ordering (currently kiosk-focused)
- [ ] Delivery integration
- [ ] Order notifications/emails
- [ ] Mobile-responsive improvements for kiosk screens
- [ ] Accessibility improvements

### ❌ System Administration
- [ ] Settings/configuration panel
- [ ] Backup & restore functionality
- [ ] Audit logs
- [ ] Database maintenance tools
- [ ] Error reporting/logging dashboard

### ❌ Testing & Deployment Features
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] CI/CD pipeline
- [ ] Environment-specific configurations
- [ ] Error tracking (Sentry, etc.)

---

## Implementation Progress Summary

| Feature Area | Status | Completion | Notes |
|--------------|--------|-----------|-------|
| **Authentication** | ✅ Complete | 100% | Google OAuth fully integrated |
| **Database** | ✅ Complete | 100% | Connection configured and working |
| **Menu System** | ✅ Complete | 100% | API and queries implemented |
| **Customer Ordering** | ✅ Complete | 100% | Full UI with add-ons and cart |
| **Order Submission** | ✅ Complete | 100% | API accepts and stores orders |
| **Portal/Home** | ✅ Complete | 100% | Landing page with navigation |
| **Employee Login** | ✅ Complete | 100% | Working with role verification |
| **Cashier Terminal** | ⚠️ Skeleton | 5% | Route protected, needs full implementation |
| **Manager Dashboard** | ⚠️ Skeleton | 5% | Route protected, needs full implementation |
| **Order Management** | ❌ Not Started | 0% | No order tracking/updates yet |
| **Customer Accounts** | ❌ Not Started | 0% | No customer-side login/history |
| **Payments** | ❌ Not Started | 0% | No payment processing |
| **Menu Management** | ❌ Not Started | 0% | Admins can't edit menu yet |
| **Inventory** | ❌ Not Started | 0% | No stock tracking |
| **Analytics** | ❌ Not Started | 0% | No reporting dashboards |

---

## Key Next Steps (Priority Order)

1. **Implement Cashier Terminal**
   - Display pending orders in queue
   - Status update interface
   - Mark orders as ready/completed

2. **Implement Manager Dashboard**
   - Basic sales analytics
   - Order history viewing
   - Real-time order monitoring

3. **Order Status Tracking**
   - Retrieve order history
   - Display order details
   - Update order status

4. **Customer Features**
   - Payment processing integration
   - Order history viewing

5. **Admin/Menu Management**
   - Menu item CRUD operations
   - Category management

---

## File Structure Reference

```
app/
  layout.tsx                 # Root layout with Taro Root branding
  globals.css               # Tailwind theme and custom CSS
  (portal)/page.tsx         # Home/landing page
  (customer)/order/page.tsx # Customer ordering interface
  (cashier)/cashier/page.tsx # Cashier dashboard (skeleton)
  (manager)/manager/page.tsx # Manager dashboard (skeleton)
  login/page.tsx            # Employee login page
  api/
    auth/[...nextauth]/route.ts  # NextAuth handler
    menu/route.ts                # Menu API endpoint
    orders/route.ts              # Order submission endpoint

lib/
  auth.ts                   # NextAuth configuration and callbacks
  db.ts                     # PostgreSQL connection pool
  types.ts                  # TypeScript interfaces (MenuItem, Order, etc.)
  queries/
    menu.ts                 # Menu query functions
    orders.ts               # Order submission function

types/
  next-auth.d.ts           # NextAuth type extensions
```

---

## Environment Variables Required

```
DB_HOST=csce-315-db.engr.tamu.edu
DB_PORT=5432
DB_NAME=team_75_db
DB_USER=<your_db_user>
DB_PASS=<your_db_password>

GOOGLE_CLIENT_ID=<your_google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<your_google_oauth_client_secret>
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

Visit http://localhost:3000 (development) or https://team-75-project-3.onrender.com (production)

---

**Last Updated**: April 2026  
**Hosted At**: https://team-75-project-3.onrender.com/
