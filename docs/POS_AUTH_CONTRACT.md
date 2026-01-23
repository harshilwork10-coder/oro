# POS Auth Contract

## Header
All POS API endpoints require the `X-Station-Token` header:
```
X-Station-Token: <JWT>
```

## Status Codes

| Code | Response | Android Action |
|------|----------|---------------|
| `200` | Success + data | Continue |
| `401` | `TOKEN_INVALID_OR_EXPIRED` | Show re-pair modal |
| `403` | `DEVICE_NOT_PAIRED` | Show pairing screen |

## JWT Payload
```json
{
  "stationId": "cmk...",
  "locationId": "cmk...",
  "franchiseId": "cmk...",
  "deviceFingerprint": "abc123",
  "stationName": "REG1",
  "issuedAt": 1706000000000
}
```

## Token Lifetime
- **Expiry:** 90 days
- **Revocation:** Dashboard → Devices → Revoke Station

## Protected Endpoints
All `/api/pos/**` routes require stationToken:
- `/api/pos/menu`
- `/api/pos/employees-for-login`
- `/api/pos/bootstrap`
- `/api/pos/staff`
- `/api/pos/station/config`
- `/api/pos/transaction`

## Architecture

```mermaid
sequenceDiagram
    participant Android
    participant ApiClient
    participant POSEndpoint
    participant posAuth
    
    Android->>ApiClient: API call
    ApiClient->>ApiClient: StationAuthInterceptor adds X-Station-Token
    ApiClient->>POSEndpoint: Request + header
    POSEndpoint->>posAuth: withPOSAuth(handler)
    posAuth->>posAuth: Validate JWT
    alt Token Valid
        posAuth->>POSEndpoint: context (stationId, locationId, franchiseId)
        POSEndpoint->>Android: 200 + data
    else Token Missing
        posAuth->>Android: 403 DEVICE_NOT_PAIRED
    else Token Invalid/Expired
        posAuth->>Android: 401 TOKEN_INVALID_OR_EXPIRED
    end
```
