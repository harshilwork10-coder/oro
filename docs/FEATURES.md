# Oronex POS System - Complete Feature Documentation

> **For Investors & Stakeholders**  
> Last Updated: January 2026

---

## 🏢 Platform Overview

**Oronex** is a comprehensive cloud-based POS and business management platform designed for:
- Multi-store retail (convenience stores, gas stations, tobacco shops)
- Service businesses (salons, barbershops, spas)
- Franchise operations

### User Hierarchy
| Role | Access Level |
|------|-------------|
| **PROVIDER** | Platform admin - manages all franchisors |
| **FRANCHISOR** | Brand owner - manages multiple franchisees |
| **OWNER** | Store owner - manages their locations |
| **MANAGER** | Store manager - day-to-day operations |
| **EMPLOYEE** | Staff - POS access only |

---

## 💳 POS System (Point of Sale)

### Core Transaction Features
| Feature | Description |
|---------|-------------|
| **Barcode Scanning** | Camera + USB scanner support |
| **Quick Add** | Add products by name if barcode not found |
| **Split Payments** | Cash + Card combinations |
| **Card Terminal Integration** | PAX terminal support |
| **Customer Display** | Second screen for customers |
| **Receipt Printing** | Thermal printer support |
| **Offline Mode** | Works without internet, syncs later |

### Payment Methods
- Cash (with auto-change calculation)
- Credit/Debit Card (via PAX terminal)
- Split Payment (any combination)
- EBT/Food Stamps (configured per store)

### Advanced POS Features
| Feature | Description |
|---------|-------------|
| **Kiosk Mode** | Lock POS to prevent unauthorized access |
| **PIN Exit** | Owner/Manager PIN to exit kiosk mode |
| **Shift Management** | Open/close shifts with cash counts |
| **Void Transactions** | Manager approval required |
| **Refunds** | Full and partial, card verification |
| **Age Verification** | For tobacco/alcohol products |
| **Lottery/Scratch Tickets** | Built-in tracking |
| **Cash Payouts** | Track cash payouts with reasons |

### POS Permissions (Configurable per Employee)
- Process refunds
- Apply manual discounts
- Void transactions
- Access price override
- Open cash drawer
- Manage shifts

---

## 📊 Owner Dashboard

### Sales & Analytics
| Feature | Description |
|---------|-------------|
| **Real-time Sales** | Live transaction feed |
| **Daily/Weekly/Monthly Reports** | Trend analysis |
| **Top Products** | Best sellers with margins |
| **Payment Breakdown** | Cash vs Card ratios |
| **Hourly Sales Chart** | Peak hours identification |
| **Employee Performance** | Sales per employee |

### Inventory Management
| Feature | Description |
|---------|-------------|
| **Product Management** | Add, edit, delete products |
| **Category Organization** | Hierarchical categories |
| **Bulk Import** | CSV file upload |
| **Stock Tracking** | Real-time stock levels |
| **Low Stock Alerts** | Configurable thresholds |
| **Price Updates** | Single or bulk |
| **Per-Location Pricing** | Different prices per store |

### Printing & Hardware
| Feature | Description |
|---------|-------------|
| **Receipt Printing** | Thermal receipt printers (ESC/POS) |
| **Price Tag/Label Printing** | ZPL label printers for shelf tags |
| **Kitchen Printing** | Orders to kitchen (restaurants) |
| **Bar Printing** | Drink orders to bar |
| **Multi-Printer Support** | Different printers per station |
| **Print Agent** | Windows print agent for hardware |
| **Configurable Label Width** | Custom label sizes |

### Employee Management
| Feature | Description |
|---------|-------------|
| **Employee Profiles** | Contact, role, permissions |
| **PIN Management** | Secure login PINs |
| **Shift Scheduling** | Visual calendar |
| **Time Clock** | Clock in/out tracking |
| **Performance Reports** | Sales per employee |
| **Role-Based Permissions** | Granular access control |

### Customer Management
| Feature | Description |
|---------|-------------|
| **Customer Database** | Contact info, history |
| **Loyalty Program** | Points earning/redemption |
| **Purchase History** | All transactions |
| **SMS Marketing** | Promotional messages |
| **Customer Lookup** | Quick phone search at POS |

### Financial Reports
| Type | Details |
|------|---------|
| **Sales Reports** | By date, product, category |
| **Profit Margins** | Cost vs selling price |
| **Tax Reports** | Sales tax collected |
| **Shift Reports** | Cash reconciliation |
| **Refund Reports** | Refund tracking |
| **Lottery Reports** | Ticket sales/payouts |

---

## 📱 Oro Pulse (Mobile Dashboard)

> Mobile-first dashboard for owners on the go

### PWA (Progressive Web App)
| Feature | Description |
|---------|-------------|
| **Install to Home Screen** | Add to phone like a native app |
| **Cached Data Viewing** | View last-synced stats when offline |
| **Push Notifications** | Real-time alerts |
| **No App Store Needed** | No fees, instant updates |
| **Auto-Updates** | Always latest version |

> **Note:** Full offline mode is in the POS (transaction queuing). Pulse shows cached data when offline.

### Sales Tab
| Feature | Description |
|---------|-------------|
| **Today's Sales** | Real-time total |
| **Yesterday Comparison** | Performance tracking |
| **Week/Month Totals** | Trend visibility |
| **Transaction Count** | Orders processed |
| **Average Ticket** | Average sale value |
| **Payment Mix** | Cash/Card percentage |

### Inventory Tab
| Feature | Description |
|---------|-------------|
| **Product Search** | Find by name or barcode |
| **Barcode Scanner** | Camera-based scanning |
| **Stock Levels** | Current quantities |
| **Price Updates** | Change prices on mobile |
| **Stock Adjustments** | Add/remove stock |
| **Add New Product** | Quick product creation |
| **Low Stock Alerts** | Products below threshold |

### Reports Tab
| Feature | Description |
|---------|-------------|
| **Quick Stats** | Today, yesterday, week |
| **Top Products** | Best selling items |
| **Sales Trends** | Visual charts |
| **Location Filter** | View by store |

### Multi-Store Features in Pulse
| Feature | Description |
|---------|-------------|
| **Location Selector** | Switch between stores |
| **All Locations View** | Combined data |
| **Per-Location Stock** | Stock by store |
| **Per-Location Pricing** | Set prices per store |
| **Location Comparison** | Side-by-side |

---

## 🏪 Multi-Store Management

### Inter-Store Transfers
| Feature | Description |
|---------|-------------|
| **Create Transfer** | Move stock between locations |
| **Approval Workflow** | Request → Approve → Ship → Receive |
| **Discrepancy Handling** | Missing items tracking |
| **Transfer History** | Complete audit trail |
| **Auto Stock Update** | Deduct/add on ship/receive |

### Per-Location Features
| Feature | Description |
|---------|-------------|
| **Per-Location Pricing** | Different prices per store |
| **Per-Location Stock** | Track stock separately |
| **Low Stock by Location** | Alerts per store |
| **Location-Specific Reports** | Filter by store |

### Centralized Control
| Feature | Description |
|---------|-------------|
| **Unified Dashboard** | See all stores at once |
| **Bulk Price Updates** | Update across stores |
| **Employee Management** | Assign to locations |
| **Cross-Location Customer Data** | Shared loyalty |

---

## 🔒 Security Features

### Authentication
| Feature | Description |
|---------|-------------|
| **Session-Based Auth** | NextAuth.js |
| **Password Hashing** | bcrypt (cost 12) |
| **Magic Links** | Email-based onboarding |
| **PIN Login** | Quick employee access |
| **Role-Based Access** | Granular permissions |

### API Security
| Feature | Description |
|---------|-------------|
| **Rate Limiting** | Brute force protection |
| **Input Validation** | XSS/injection prevention |
| **Franchise Isolation** | IDOR protection |
| **Audit Logging** | Security event tracking |

### POS Security
| Feature | Description |
|---------|-------------|
| **Kiosk Mode** | Locked interface |
| **PIN Exit Required** | Owner/manager only |
| **Transaction Limits** | Configurable thresholds |
| **Void Approval** | Manager override required |

---

## 🛠️ Provider Admin Features

### Client Management
| Feature | Description |
|---------|-------------|
| **Onboarding Wizard** | Add new franchisors |
| **Magic Link Generation** | Easy client setup |
| **License Management** | Feature activation |
| **Subscription Tracking** | Billing status |

### Support Tools
| Feature | Description |
|---------|-------------|
| **Password Reset** | Reset owner passwords |
| **Activity Logs** | Track user actions |
| **Remote Troubleshooting** | View client data |
| **Feature Flags** | Enable/disable features |

---

## 📈 Technical Specifications

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Prisma ORM) |
| **Authentication** | NextAuth.js |
| **Hosting** | Vercel |
| **Real-time** | Server-Sent Events |

### Scalability
- Cloud-native architecture
- Multi-tenant design
- Horizontal scaling ready
- CDN for static assets

---

## 🚀 Roadmap / Future Features

- [ ] AI Voice POS
- [ ] AI Dynamic Pricing Suggestions
- [ ] E-commerce Integration
- [ ] Advanced Analytics Dashboard
- [ ] Automated Reordering
- [ ] Vendor Management
- [ ] Accounting Integration (QuickBooks)

> **Note:** Native iOS/Android apps are NOT needed - Oro Pulse is a **PWA (Progressive Web App)** that can be installed directly from the browser to the home screen. Works offline, sends push notifications, and looks/feels like a native app without App Store/Play Store fees.
