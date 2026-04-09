# Changelog

All notable changes to ORO Gurus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-09

### 🎉 Initial Release — ORO Gurus v1.0.0

The first official versioned release of the ORO 9 Franchise POS Platform.

### Features
- **Multi-Tier Hierarchy**: Provider → Franchisor → Franchisee → Location management
- **Retail POS**: Full checkout flow with barcode scanning, dual-input support, and dual pricing (cash/card)
- **Salon Vertical**: Walk-in queue, service timers, commission tracking, formula vaults, memberships, and digital consultation forms
- **Owner Dashboard**: Reports hub with sales, tax, employee, and inventory analytics
- **Franchisor (HQ) Dashboard**: Multi-location portfolio reporting with compliance and exception tracking
- **Station Pairing**: Secure device pairing lifecycle with restore-device flow
- **Loyalty & Gift Cards**: Points-based loyalty program and gift card management
- **Customer Display**: Secondary screen support for transaction transparency
- **Role-Based Access Control**: Provider, Franchisor, Owner, Manager, Cashier, Barber roles with scoped permissions
- **Brand Theme Pack**: 6 preset themes for controlled merchant customization
- **Offline Architecture**: POS operates during connectivity loss with sync-on-reconnect
- **Android Native POS**: Kotlin/Compose app with PAX terminal optimization

### Security
- Station-bound JWT authentication
- Non-bypassable middleware for all API routes
- PCI-compliant data flow for payment processing
- Activity logging and audit trails

### Infrastructure
- Next.js 15 web platform with App Router
- Prisma ORM with PostgreSQL
- Upstash Redis caching layer
- AWS S3 for media storage
- Resend for transactional email
