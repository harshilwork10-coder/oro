import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

// Create PDF document
const doc = new jsPDF();
let yPos = 20;
const leftMargin = 15;
const pageWidth = 180;
const lineHeight = 7;

function addTitle(text: string, size: number = 20) {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, leftMargin, yPos);
    yPos += lineHeight + 5;
}

function addSubtitle(text: string, size: number = 14) {
    checkPageBreak(15);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, leftMargin, yPos);
    yPos += lineHeight + 2;
}

function addText(text: string, size: number = 10) {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth);
    for (const line of lines) {
        checkPageBreak(10);
        doc.text(line, leftMargin, yPos);
        yPos += lineHeight - 1;
    }
}

function addBullet(text: string) {
    checkPageBreak(10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 10);
    doc.text('•', leftMargin, yPos);
    for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], leftMargin + 5, yPos);
        if (i < lines.length - 1) {
            yPos += lineHeight - 2;
            checkPageBreak(10);
        }
    }
    yPos += lineHeight - 1;
}

function addSpace(height: number = 5) {
    yPos += height;
}

function checkPageBreak(requiredSpace: number) {
    if (yPos + requiredSpace > 280) {
        doc.addPage();
        yPos = 20;
    }
}

function addTableRow(col1: string, col2: string, isHeader: boolean = false) {
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
    doc.text(col1, leftMargin, yPos);
    const col2Lines = doc.splitTextToSize(col2, 120);
    doc.text(col2Lines[0], leftMargin + 55, yPos);
    yPos += lineHeight - 1;
    for (let i = 1; i < col2Lines.length; i++) {
        checkPageBreak(10);
        doc.text(col2Lines[i], leftMargin + 55, yPos);
        yPos += lineHeight - 2;
    }
}

// ============================================
// PAGE 1: COVER & OVERVIEW
// ============================================
doc.setFillColor(30, 41, 59);
doc.rect(0, 0, 210, 297, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(36);
doc.setFont('helvetica', 'bold');
doc.text('ORO 9', 105, 80, { align: 'center' });

doc.setFontSize(24);
doc.text('POS System', 105, 95, { align: 'center' });

doc.setFontSize(14);
doc.setFont('helvetica', 'normal');
doc.text('Complete Project Documentation', 105, 115, { align: 'center' });

doc.setFontSize(10);
doc.text('Multi-Tenant Point of Sale System', 105, 140, { align: 'center' });
doc.text('for Franchise Businesses', 105, 150, { align: 'center' });

doc.setFontSize(10);
doc.text('January 2026', 105, 200, { align: 'center' });

doc.setFontSize(8);
doc.text('PROPRIETARY & CONFIDENTIAL', 105, 280, { align: 'center' });

// ============================================
// PAGE 2: SYSTEM OVERVIEW
// ============================================
doc.addPage();
doc.setTextColor(0, 0, 0);
yPos = 20;

addTitle('1. System Overview');
addSpace(3);
addText('ORO 9 is a comprehensive multi-tenant Point of Sale (POS) system designed for franchise businesses across multiple verticals including liquor stores, vape shops, salons, restaurants, and retail operations.');
addSpace(5);
addText('The system is built to scale from a single storefront to massive franchise operations (5,000+ stores), providing deep hierarchical management and real-time operational insights.');
addSpace(5);
addText('ORO 9 utilizes a Single-App Multi-Vertical Strategy, allowing one binary to serve Salon, Retail, and Restaurant operations via dynamic UI reconfiguration.');

addSpace(10);
addSubtitle('Supported Business Verticals');
addBullet('Liquor Stores - Age verification, inventory tracking, dual pricing');
addBullet('Vape Shops - Compliance features, product catalogs');
addBullet('Salons/Barbershops - Appointments, services, employee scheduling');
addBullet('Restaurants - Menu management, table ordering');
addBullet('General Retail - Full POS, inventory, customer loyalty');

addSpace(10);
addSubtitle('Multi-Tenant Hierarchy (4 Tiers)');
addSpace(3);
addBullet('PROVIDER (ORO 9) - The platform root and system administrator');
addBullet('FRANCHISOR (Brand Layer) - A brand or chain owner (e.g., "Brand ABC"). Owns BusinessConfig and Brand Catalog');
addBullet('FRANCHISE (Store Owner) - Individual business entities/owners who may manage one or more stores');
addBullet('LOCATION (Physical Store) - The physical context for POS terminals. All transactions, employees, inventory scoped here');

// ============================================
// PAGE 3: TECHNOLOGY STACK
// ============================================
doc.addPage();
yPos = 20;

addTitle('2. Technology Stack');
addSpace(5);

addSubtitle('Core Technologies');
addSpace(3);
addTableRow('Layer', 'Technology', true);
doc.setDrawColor(200, 200, 200);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('Web Frontend', 'Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS');
addTableRow('Mobile/Tablet', 'Native Kotlin (Android) with Jetpack Compose');
addTableRow('Backend', 'Next.js Serverless API Routes (hosted on Vercel)');
addTableRow('Database', 'Prisma ORM with PostgreSQL (Cloud) / SQLite + Room (Local)');
addTableRow('Authentication', 'NextAuth.js (Web) / Session Tokens & Bearer Tokens (Mobile)');
addTableRow('SMS Service', 'Twilio for transactional and marketing SMS');
addTableRow('File Storage', 'AWS S3 for onboarding documents and assets');
addTableRow('Payments', 'PAX Terminal integration (TCP/IP and on-device SDK)');

addSpace(10);
addSubtitle('Key Dependencies');
addSpace(3);
addBullet('@prisma/client - Database ORM for type-safe queries');
addBullet('next-auth - Authentication and session management');
addBullet('jspdf - PDF generation for receipts and reports');
addBullet('qrcode.react - QR code generation for customer display');
addBullet('lucide-react - UI icons');
addBullet('swr - Data fetching and caching');
addBullet('date-fns - Date/time utilities');
addBullet('bcrypt/bcryptjs - Password hashing');
addBullet('jsonwebtoken - JWT token handling');

addSpace(10);
addSubtitle('Design Principles');
addSpace(3);
addBullet('Unified Cloud Backbone - Single Source of Truth for all data');
addBullet('Hybrid Persistence - Cloud PostgreSQL + Local caching for offline resilience');
addBullet('Hardened Multi-Tenancy - Per-request ownership checks (IDOR guards)');
addBullet('Synchronized Manifestation - Physical replication of brand templates for performance');

// ============================================
// PAGE 4: KEY FEATURES
// ============================================
doc.addPage();
yPos = 20;

addTitle('3. Key Features');
addSpace(5);

addSubtitle('Transaction Management');
addBullet('Dual pricing support (Cash/Card with configurable surcharge)');
addBullet('Split payments across multiple methods');
addBullet('Tips with percentage presets and custom amounts');
addBullet('Tax-on-charged-price calculations');
addBullet('Voids and refunds with mandatory audit logging');
addBullet('Smart Home Tiles - Dynamic product suggestions');

addSpace(5);
addSubtitle('Payment Integration');
addBullet('PAX terminal TCP/IP proxy for distributed terminals');
addBullet('On-device SDK for integrated smart terminals');
addBullet('Offline mode with IndexedDB sync');
addBullet('Cash drawer management and drops');

addSpace(5);
addSubtitle('Customer Loyalty & CRM');
addBullet('Points-based loyalty program');
addBullet('VIP tier system with automatic upgrades');
addBullet('Fair Discount System (best-offer logic)');
addBullet('Customer streaks and engagement tracking');
addBullet('Marketing consent management (PEWC compliance)');

addSpace(5);
addSubtitle('Inventory Management');
addBullet('SKU lookup engine with barcode scanning');
addBullet('Low stock alerts with configurable thresholds');
addBullet('Cross-store inventory visibility');
addBullet('Auto-reorder logic and purchase orders');
addBullet('SharedUPCProduct - Crowdsourced product database');

// ============================================
// PAGE 5: MORE FEATURES
// ============================================
doc.addPage();
yPos = 20;

addTitle('3. Key Features (Continued)');
addSpace(5);

addSubtitle('Employee Operations');
addBullet('PIN-based POS login for quick switching');
addBullet('Time clock with server-authoritative tracking');
addBullet('Shift/cash drawer management');
addBullet('Employee compensation tracking (W2 vs Booth Renter)');
addBullet('Role-based permissions and access control');
addBullet('Commission and tips reporting');

addSpace(5);
addSubtitle('Salon-Specific Features');
addBullet('Appointment booking with partial booking support');
addBullet('Services catalog with Brand Catalog inheritance');
addBullet('Employee scheduling and availability');
addBullet('Client management and service history');
addBullet('Walk-in queue management');

addSpace(5);
addSubtitle('Communication');
addBullet('Automated SMS/Email receipts');
addBullet('Marketing campaign management');
addBullet('Appointment reminders');
addBullet('Deal suggestions with AI-powered recommendations');
addBullet('SMS quota management with 1500 free monthly messages');

addSpace(5);
addSubtitle('Compliance & Audit');
addBullet('Unified AuditLog for all sensitive actions');
addBullet('Financial record immutability (no deletions)');
addBullet('Hierarchical feature flags (Station > Location > LLC > HQ)');
addBullet('5-stage compliant offboarding process');
addBullet('GDPR/CCPA data retention protocols');

// ============================================
// PAGE 6: DATABASE SCHEMA
// ============================================
doc.addPage();
yPos = 20;

addTitle('4. Database Schema');
addSpace(5);

addSubtitle('Core Management Models');
addSpace(3);
addTableRow('Model', 'Description', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('Provider', 'Platform root entity representing ORO 9');
addTableRow('Franchisor', 'Brand/chain owner with BusinessConfig settings');
addTableRow('Franchise', 'Individual store owner group (LLC)');
addTableRow('Location', 'Physical storefront with terminals and settings');
addTableRow('User', 'Account identity with roles and permissions');
addTableRow('Client', 'Customer profiles with loyalty and marketing data');

addSpace(8);
addSubtitle('Transactional & POS Models');
addSpace(3);
addTableRow('Model', 'Description', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('Product', 'Inventory items for retail');
addTableRow('Service', 'Service items for salons/service businesses');
addTableRow('Transaction', 'Master record for sales with line items');
addTableRow('Station', 'POS terminals/registers with hardware bindings');
addTableRow('Appointment', 'Flexible booking records with partial support');
addTableRow('DrawerSession', 'Cash drawer lifecycle tracking');
addTableRow('AuditLog', 'Centralized sensitive action tracking');
addTableRow('TimeClockSession', 'Employee clock in/out records');

addSpace(8);
addSubtitle('Brand Catalog Models');
addSpace(3);
addTableRow('GlobalServiceCategory', 'HQ-managed service categories');
addTableRow('GlobalService', 'Master service templates from Brand HQ');
addTableRow('LocationServiceOverride', 'Per-location customizations');

// ============================================
// PAGE 7: API STRUCTURE
// ============================================
doc.addPage();
yPos = 20;

addTitle('5. API Structure');
addSpace(5);

addText('The system includes 497+ API routes organized by functionality:');
addSpace(5);

addSubtitle('Core API Categories');
addSpace(3);
addTableRow('Category', 'Endpoints', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('/api/auth/*', 'Authentication, login, password management');
addTableRow('/api/pos/*', 'Point of sale operations, checkout, payments');
addTableRow('/api/inventory/*', 'Product management, stock, purchase orders');
addTableRow('/api/transactions/*', 'Sales history, refunds, voids');
addTableRow('/api/customers/*', 'Customer CRM, loyalty, search');
addTableRow('/api/employees/*', 'Employee management, schedules, time clock');
addTableRow('/api/appointments/*', 'Booking management (salon vertical)');
addTableRow('/api/reports/*', 'Analytics, sales reports, dashboards');
addTableRow('/api/admin/*', 'Administrative functions, settings');
addTableRow('/api/franchisor/*', 'HQ/Brand management endpoints');
addTableRow('/api/provider/*', 'Platform-level administration');
addTableRow('/api/pax/*', 'Payment terminal integration');
addTableRow('/api/sms/*', 'SMS messaging and campaigns');
addTableRow('/api/pulse/*', 'Real-time analytics and alerts');

addSpace(10);
addSubtitle('Authentication Patterns');
addBullet('Web: NextAuth session-based authentication');
addBullet('Mobile: Bearer token with JWT verification');
addBullet('Hybrid endpoints support both auth methods');
addBullet('Role-based access control on all endpoints');
addBullet('Franchise/Location scope enforcement');

// ============================================
// PAGE 8: USER PORTALS
// ============================================
doc.addPage();
yPos = 20;

addTitle('6. User Portals & Interfaces');
addSpace(5);

addSubtitle('Administrative Portals');
addSpace(3);
addTableRow('Portal', 'Description', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('/provider/*', 'Platform-wide administration, dealer management, account provisioning');
addTableRow('/franchisor/*', 'Brand HQ management, reports, catalog, franchisee oversight');
addTableRow('/dashboard/*', 'Store management (165+ pages) - POS, inventory, employees, reports');
addTableRow('/owner/*', 'Business owner specific features and settings');

addSpace(8);
addSubtitle('Operational Interfaces');
addSpace(3);
addTableRow('/employee/*', 'Employee self-service portal');
addTableRow('/employee-login', 'PIN-based quick employee login');
addTableRow('/staff-login', 'Staff authentication page');
addTableRow('/my-schedule', 'Employee schedule viewing');
addTableRow('/my-services', 'Employee service assignments');

addSpace(8);
addSubtitle('Customer-Facing Interfaces');
addSpace(3);
addTableRow('/kiosk/*', 'Customer self-checkout kiosk');
addTableRow('/customer-display', 'Receipt/payment display screen');
addTableRow('/book/*', 'Online appointment booking');
addTableRow('/pulse/*', 'Analytics dashboard');

addSpace(10);
addSubtitle('Mobile Applications');
addBullet('Native Android POS - Kotlin with Jetpack Compose');
addBullet('WebView hybrid for checkout flows');
addBullet('Offline Room database for resilience');
addBullet('Direct hardware integration (PAX, printers)');

// ============================================
// PAGE 9: SECURITY
// ============================================
doc.addPage();
yPos = 20;

addTitle('7. Security & Compliance');
addSpace(5);

addSubtitle('Authentication & Authorization');
addBullet('Role-Based Access Control (RBAC) with roles: PROVIDER, FRANCHISOR, OWNER, MANAGER, EMPLOYEE');
addBullet('Multi-tenant data isolation with per-request ownership checks');
addBullet('Approval Guard - Merchants must be APPROVED to access core routes');
addBullet('Dual-Identity Authorization for corporate resources');
addBullet('JWT Bearer tokens for mobile with mandatory verification');

addSpace(5);
addSubtitle('Financial Security');
addBullet('Transaction Immutability - Financial records cannot be deleted');
addBullet('Linked Reversals - Every refund/void references original transaction');
addBullet('Mandatory audit metadata (reason, approvedBy) for reversals');
addBullet('Append-only event logs for financial operations');

addSpace(5);
addSubtitle('Audit & Compliance');
addBullet('Unified AuditLog capturing all sensitive actions');
addBullet('Activity logging with logActivity() for permanent audit trail');
addBullet('PCI data flow compliance');
addBullet('GDPR/CCPA compliant data handling');
addBullet('5-stage offboarding (SUSPENDED, EXPORT, ANONYMIZE, ARCHIVED)');

addSpace(5);
addSubtitle('Infrastructure Security');
addBullet('Environment variable protection for secrets');
addBullet('Secure password hashing with bcrypt');
addBullet('Input validation and sanitization');
addBullet('CORS and CSP headers configured');

// ============================================
// PAGE 10: DEPLOYMENT
// ============================================
doc.addPage();
yPos = 20;

addTitle('8. Deployment & Configuration');
addSpace(5);

addSubtitle('Required Environment Variables');
addSpace(3);
addTableRow('Variable', 'Description', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('DATABASE_URL', 'PostgreSQL connection string');
addTableRow('NEXTAUTH_SECRET', 'NextAuth.js secret key');
addTableRow('NEXTAUTH_URL', 'Application base URL');
addTableRow('TWILIO_ACCOUNT_SID', 'Twilio account identifier');
addTableRow('TWILIO_AUTH_TOKEN', 'Twilio authentication token');
addTableRow('TWILIO_PHONE_NUMBER', 'Twilio sending phone number');
addTableRow('AWS_ACCESS_KEY_ID', 'AWS S3 access key');
addTableRow('AWS_SECRET_ACCESS_KEY', 'AWS S3 secret key');
addTableRow('AWS_S3_BUCKET', 'S3 bucket name for document storage');

addSpace(10);
addSubtitle('Quick Start Commands');
addSpace(3);
doc.setFont('courier', 'normal');
doc.setFontSize(9);
const commands = [
    '# Install dependencies',
    'npm install',
    '',
    '# Generate Prisma client',
    'npx prisma generate',
    '',
    '# Push database schema',
    'npx prisma db push',
    '',
    '# Seed database (optional)',
    'npx prisma db seed',
    '',
    '# Run development server',
    'npm run dev',
    '',
    '# Build for production',
    'npm run build',
];
for (const cmd of commands) {
    checkPageBreak(8);
    doc.text(cmd, leftMargin, yPos);
    yPos += 5;
}
doc.setFont('helvetica', 'normal');

addSpace(10);
addSubtitle('Hosting');
addBullet('Primary: Vercel (serverless deployment)');
addBullet('Database: PostgreSQL (Vercel Postgres, Supabase, or similar)');
addBullet('File Storage: AWS S3');
addBullet('SMS: Twilio');

// ============================================
// PAGE 11: CONTACT & LEGAL
// ============================================
doc.addPage();
yPos = 20;

addTitle('9. Documentation & Resources');
addSpace(5);

addSubtitle('Available Documentation Files');
addSpace(3);
addTableRow('File', 'Description', true);
doc.line(leftMargin, yPos - 3, leftMargin + pageWidth, yPos - 3);
addTableRow('README.md', 'Project overview and quick start');
addTableRow('SYSTEM_DOCUMENTATION.md', 'Detailed architecture documentation');
addTableRow('API_REFERENCE.md', 'API endpoint reference');
addTableRow('DATABASE_SCHEMA.md', 'Database model documentation');
addTableRow('DEVELOPER_GUIDE.md', 'Developer onboarding guide');
addTableRow('ARCHITECTURE.md', 'System architecture details');

addSpace(15);
addSubtitle('Project Statistics');
addSpace(3);
addBullet('938+ source files in /src directory');
addBullet('497+ API routes');
addBullet('165+ dashboard pages');
addBullet('53+ Prisma schema files');
addBullet('44+ utility scripts');

addSpace(15);
doc.setFillColor(240, 240, 240);
doc.rect(leftMargin - 5, yPos, pageWidth + 10, 40, 'F');
yPos += 10;
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('Legal Notice', leftMargin, yPos);
yPos += lineHeight;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.text('© 2024-2026 Oro POS Systems. All Rights Reserved.', leftMargin, yPos);
yPos += lineHeight - 1;
doc.text('This software is proprietary and confidential.', leftMargin, yPos);
yPos += lineHeight - 1;
doc.text('Unauthorized copying, distribution, or use is strictly prohibited.', leftMargin, yPos);

// Save PDF
const outputPath = path.join(__dirname, '..', 'ORO9_Project_Documentation.pdf');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, pdfBuffer);
console.log(`PDF generated successfully: ${outputPath}`);
