/**
 * Provider Dashboard Constants
 * 
 * Centralized constants for the Provider (internal admin) dashboard.
 * Avoids hardcoded values scattered across multiple pages.
 */

// ─── PAX Terminal Defaults ───────────────────────────────────────────────────

/** Default PAX terminal communication port */
export const DEFAULT_PAX_PORT = '10009';

// ─── Business Types ──────────────────────────────────────────────────────────

/** Human-readable labels for Franchisor business types */
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
    BRAND_FRANCHISOR: 'Brand / Franchisor',
    MULTI_STORE: 'Multi-Store Owner',
    SINGLE_STORE: 'Single Store',
};

/** Business type options for filter dropdowns */
export const BUSINESS_TYPE_OPTIONS = [
    { value: 'SALON', label: 'Salon' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'RESTAURANT', label: 'Restaurant' },
] as const;

// ─── Account Statuses ────────────────────────────────────────────────────────

export const ACCOUNT_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED'] as const;

// ─── Shipping Carriers ───────────────────────────────────────────────────────

export const CARRIERS = [
    { value: 'FedEx', label: 'FedEx' },
    { value: 'UPS', label: 'UPS' },
    { value: 'USPS', label: 'USPS' },
    { value: 'DHL', label: 'DHL' },
] as const;

export const DEFAULT_CARRIER = 'FedEx';

/** Carrier tracking URL templates. Use `{tracking}` as placeholder. */
const CARRIER_TRACKING_URLS: Record<string, string> = {
    FedEx: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
    UPS: 'https://www.ups.com/track?tracknum={tracking}',
    USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
    DHL: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}',
};

/** Build a carrier tracking URL from carrier name and tracking number */
export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
    const template = CARRIER_TRACKING_URLS[carrier];
    if (!template) return '#';
    return template.replace('{tracking}', trackingNumber);
}

// ─── Billing Plans (interim — should eventually be DB-driven) ────────────────

export const BILLING_PLANS = [
    { name: 'Starter', price: '$99', features: ['1 Location', '2 Terminals', 'Basic Support'], clients: 0 },
    { name: 'Professional', price: '$199', features: ['3 Locations', '6 Terminals', 'Priority Support'], clients: 0 },
    { name: 'Enterprise', price: '$399', features: ['Unlimited', 'Unlimited', '24/7 Support'], clients: 0 },
] as const;

// ─── System Settings (interim — should eventually be DB-driven) ──────────────

export const SYSTEM_MODULES = [
    { name: 'Inventory Management', retail: true, salon: false },
    { name: 'Appointment Scheduling', retail: false, salon: true },
    { name: 'Lottery', retail: true, salon: false },
    { name: 'Age Verification', retail: true, salon: false },
    { name: 'Gift Cards', retail: true, salon: true },
    { name: 'Loyalty Program', retail: true, salon: true },
    { name: 'Employee Time Clock', retail: true, salon: true },
    { name: 'Customer Check-In', retail: false, salon: true },
];

export const SYSTEM_ROLES = [
    { name: 'Owner', permissions: 'Full access, manage employees, view reports, settings' },
    { name: 'Manager', permissions: 'POS, inventory, employees, limited settings' },
    { name: 'Cashier', permissions: 'POS only, time clock' },
    { name: 'Stylist', permissions: 'Appointments, check-in, time clock' },
];

export const SYSTEM_TEMPLATES = [
    { name: 'Welcome Email', type: 'email', description: 'Sent when new owner account is created' },
    { name: 'Password Reset', type: 'email', description: 'Password reset link' },
    { name: 'Document Request', type: 'email', description: 'Request missing onboarding documents' },
    { name: 'Shipment Notification', type: 'sms', description: 'Hardware shipped notification' },
    { name: 'Payment Reminder', type: 'email', description: 'Past due invoice reminder' },
];

export const SYSTEM_INTEGRATIONS = [
    { name: 'PAX Payment Gateway', status: 'connected', lastUsed: '2m ago' },
    { name: 'Twilio SMS', status: 'connected', lastUsed: '15m ago' },
    { name: 'SendGrid Email', status: 'connected', lastUsed: '1h ago' },
    { name: 'QuickBooks', status: 'not-connected', lastUsed: null },
];

// ─── Monitoring ──────────────────────────────────────────────────────────────

export const MONITORING_SERVICES = [
    'POS API',
    'Payment Gateway',
    'Inventory Sync',
    'SMS Service',
    'Email Service',
    'Reporting',
];
