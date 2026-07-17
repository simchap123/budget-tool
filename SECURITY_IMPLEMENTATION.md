# Security Implementation Guide

Quick reference for implementing security features in Budget Tool.

---

## Quick Start: Priority Order

### Phase 1: Critical (Week 1-2)
Essential for any production deployment.

#### 1. Password Hashing (bcrypt)
```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

**Files to update:**
- Backend authentication service
- Add password validation before hashing
- Hash all new user passwords with cost factor 12

#### 2. JWT + httpOnly Cookies
```bash
npm install jsonwebtoken cookie
npm install --save-dev @types/jsonwebtoken
```

**Implementation:**
- Generate JWT on login
- Store in httpOnly cookie (secure, sameSite=strict)
- Validate token on each request
- Refresh token rotation after 15 minutes

#### 3. HTTPS/TLS Setup
- Use Let's Encrypt (free SSL certificates)
- Configure Nginx for TLS 1.3
- Redirect HTTP to HTTPS
- Add HSTS header

#### 4. Environment Variables
- Move all secrets to .env files
- Never commit .env to git
- Use different secrets for dev/staging/production

---

### Phase 2: Important (Week 2-4)
Implement before feature expansion.

#### 1. Input Validation (Zod)
```bash
npm install zod
```

**Apply to:**
- All API endpoints
- User registration/login
- Transaction creation
- Category management
- API forms

#### 2. CSRF Protection
```bash
npm install csurf cookie-parser
```

**Setup:**
- Generate CSRF token on page load
- Include in all POST/PUT/DELETE requests
- Validate on backend

#### 3. Rate Limiting
```bash
npm install express-rate-limit rate-limit-redis
```

**Endpoints to rate limit:**
- POST /api/auth/login (5 attempts / 15 min)
- POST /api/auth/signup (3 / 24 hours)
- POST /api/password-reset (3 / 24 hours)
- All API endpoints (100 / minute per user)

#### 4. Audit Logging
**Create audit_logs table:**
- userId
- action (LOGIN, CREATE_TRANSACTION, etc.)
- entityType & entityId
- changes (before/after)
- ipAddress, userAgent
- timestamp

#### 5. Email Verification
**Flow:**
1. User registers
2. Send verification email with token
3. Token expires after 24 hours
4. Unverified users cannot access app

---

### Phase 3: Enhanced (Week 4-6)
For security hardening and compliance.

#### 1. Field Encryption (AES-256-GCM)
```bash
npm install node-forge
```

**Encrypt these fields:**
- accounts.accountNumber
- accounts.routingNumber
- accounts.plaidAccessToken
- users SSN (if collecting)

#### 2. Password Reset Flow
**Secure implementation:**
- Reset token valid for 1 hour
- Token hashed in database
- Invalidate all sessions after reset
- Prevent user enumeration

#### 3. Security Headers
**Nginx configuration:**
```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: default-src 'self'
```

#### 4. MFA/2FA (Optional but recommended)
```bash
npm install speakeasy qrcode
```

**2FA Methods:**
- TOTP (Time-based One-Time Password)
- SMS (requires Twilio)
- Email codes

#### 5. API Keys
**For programmatic access:**
- Generate random key
- Hash key before storage
- Validate on each API request
- Rate limit by API key
- Track usage with lastUsedAt

---

### Phase 4: Operational (Ongoing)
Maintain security throughout operation.

#### 1. Monitoring & Alerts
```typescript
// Track security events
- Failed login attempts
- Unauthorized access
- Unusual activity (location, time)
- Data access patterns
```

#### 2. Automated Security Scanning
```bash
# Weekly dependency updates
npm audit fix --audit-level=moderate

# Monthly penetration testing
# Quarterly security review
```

#### 3. Key Rotation
- Encryption keys: Every 90 days
- JWT secret: Every 180 days
- Database password: Every 90 days

#### 4. Backup & Disaster Recovery
- Daily automated backups
- Test restoration monthly
- Store backups offsite
- Document recovery procedures

---

## Implementation Checklist

### Backend Setup
- [ ] Install bcrypt and hash passwords
- [ ] Implement JWT token generation
- [ ] Setup httpOnly cookie storage
- [ ] Add auth middleware to protected routes
- [ ] Implement refresh token rotation
- [ ] Add Zod schema validation
- [ ] Setup rate limiting on auth endpoints
- [ ] Create audit_logs table
- [ ] Add email verification flow
- [ ] Implement password reset flow
- [ ] Add field encryption for sensitive data
- [ ] Setup CSRF protection
- [ ] Add security headers in Nginx
- [ ] Implement API key authentication
- [ ] Setup monitoring and alerts

### Frontend Setup
- [ ] Use secure API communication (HTTPS)
- [ ] Store auth token only in httpOnly cookie
- [ ] Implement CSRF token handling
- [ ] Add form validation with Zod
- [ ] Sanitize user input (DOMPurify)
- [ ] Add error handling without exposing internals
- [ ] Implement session timeout on frontend
- [ ] Add email verification UI
- [ ] Add password reset UI
- [ ] Implement MFA/2FA UI (optional)

### Infrastructure
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Configure Nginx for TLS 1.3
- [ ] Setup UFW firewall
- [ ] Disable SSH password auth
- [ ] Setup fail2ban
- [ ] Enable OS security (SELinux/AppArmor)
- [ ] Configure Docker security options
- [ ] Setup secrets management (.env)
- [ ] Enable logging and log rotation
- [ ] Setup monitoring dashboard

### Compliance
- [ ] Write privacy policy
- [ ] Add GDPR data export endpoint
- [ ] Add GDPR data deletion endpoint
- [ ] Setup GDPR consent tracking
- [ ] Implement CCPA compliance
- [ ] Document data retention policy
- [ ] Setup audit log retention
- [ ] Create security incident response plan
- [ ] Document security procedures

---

## Common Security Mistakes to Avoid

### Authentication
❌ Storing passwords in plain text
✓ Use bcrypt with cost factor 12+

❌ Storing JWT in localStorage
✓ Use httpOnly cookies

❌ Long-lived access tokens
✓ 15 minute expiration, refresh tokens for longer

❌ No rate limiting on login
✓ Limit to 5 attempts per 15 minutes per IP

### Data Protection
❌ Storing sensitive data in plain text
✓ Use AES-256-GCM encryption

❌ Hardcoding secrets in code
✓ Use environment variables

❌ Displaying full account numbers
✓ Show only last 4 digits masked as ****1234

### API Security
❌ Returning sensitive data in error messages
✓ Generic error messages: "Invalid credentials"

❌ Trusting client-side validation only
✓ Always validate on server

❌ No HTTPS in production
✓ Enforce HTTPS with HSTS header

### Frontend Security
❌ Using dangerouslySetInnerHTML with user input
✓ Let React auto-escape content

❌ Storing tokens in localStorage
✓ Use httpOnly cookies

❌ No CSRF protection
✓ Include CSRF token in all state-changing requests

---

## Testing Security

### Manual Testing
```bash
# Test password validation
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak"}'
# Should fail

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Should get 429 Too Many Requests after 5 attempts

# Test HTTPS redirect
curl -i http://budgettool.com
# Should get 301 redirect to https://
```

### Automated Security Scanning
```bash
# Dependency vulnerabilities
npm audit

# OWASP ZAP (free penetration testing)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://budgettool.com

# Check SSL configuration
nmap --script ssl-enum-ciphers -p 443 budgettool.com

# Test password strength
# Use: https://haveibeenpwned.com/Passwords
```

### Security Code Review Checklist
- [ ] No secrets hardcoded
- [ ] All user input validated
- [ ] All output escaped
- [ ] Rate limiting implemented
- [ ] Auth on all sensitive endpoints
- [ ] Errors don't leak info
- [ ] Logs don't contain secrets
- [ ] Database queries parameterized
- [ ] HTTPS enforced
- [ ] CORS configured correctly

---

## Deployment Security Checklist

### Pre-Deployment
- [ ] Security code review completed
- [ ] Penetration testing passed
- [ ] Dependency vulnerabilities resolved
- [ ] Environment variables configured
- [ ] SSL certificate obtained
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Incident response plan documented

### Deployment Day
- [ ] Deploy during low-traffic period
- [ ] Have rollback plan ready
- [ ] Monitor for errors
- [ ] Verify HTTPS working
- [ ] Test login/logout flow
- [ ] Check security headers
- [ ] Verify rate limiting active
- [ ] Review logs for issues

### Post-Deployment
- [ ] Monitor security alerts
- [ ] Check audit logs
- [ ] Verify backup working
- [ ] Document any issues
- [ ] Plan next security improvements

---

## Environment Variables Template

```bash
# .env (development)
NODE_ENV=development
DATABASE_URL=postgresql://dev:dev@localhost/budget_dev
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)

# Email (for verification/reset)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_key_here
EMAIL_FROM=noreply@budgettool.dev

# Third-party APIs
ANTHROPIC_API_KEY=your_key_here
PLAID_CLIENT_ID=your_id_here
PLAID_SECRET=your_secret_here

# Frontend
VITE_API_URL=http://localhost:8090
```

```bash
# .env.production (DigitalOcean)
NODE_ENV=production
DATABASE_URL=postgresql://user:${DB_PASSWORD}@localhost/budget_prod
JWT_SECRET=${JWT_SECRET}  # Set via CI/CD secrets
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}
CSRF_SECRET=${CSRF_SECRET}

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=${SENDGRID_API_KEY}
EMAIL_FROM=noreply@budgettool.com

# APIs
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
PLAID_SECRET=${PLAID_SECRET}

# Frontend
VITE_API_URL=https://api.budgettool.com
```

---

## Security Headers for Nginx

```nginx
# /etc/nginx/conf.d/security.conf

# Prevent content type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Disable framing/clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Enable XSS protection in older browsers
add_header X-XSS-Protection "1; mode=block" always;

# HTTPS-only
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Disable referrer for privacy
add_header Referrer-Policy "no-referrer-when-downgrade" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;

# Disable browser feature access
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
```

---

## Monitoring & Alerting Setup

### Key Metrics to Monitor
- Failed login attempts (alert if > 5/hour)
- API response times (alert if > 1 second avg)
- Error rate (alert if > 1%)
- Database connection pool usage (alert if > 80%)
- Disk space (alert if < 10% free)
- SSL certificate expiration (alert if < 30 days)

### Tools
- **Application Logs**: ELK Stack or CloudWatch
- **Metrics**: Prometheus + Grafana
- **Alerts**: PagerDuty or Slack
- **Uptime**: StatusPage.io

### Sample Alert Configuration (Prometheus)
```yaml
groups:
  - name: security
    rules:
      - alert: HighFailedLoginRate
        expr: rate(failed_logins[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High failed login rate"
          
      - alert: UnauthorizedAccessAttempt
        expr: unauthorized_access_attempts > 0
        annotations:
          summary: "Unauthorized access attempt detected"
          
      - alert: SSLCertificateExpiringSoon
        expr: ssl_cert_expiry < 86400 * 30
        annotations:
          summary: "SSL certificate expires in less than 30 days"
```

---

## Response to Security Incidents

### Breach Response Plan

1. **Detect** (0-1 hour)
   - Monitor detects anomaly
   - Alert sent to security team
   - Incident severity assessed

2. **Contain** (1-2 hours)
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable additional logging
   - Notify relevant teams

3. **Eradicate** (2-8 hours)
   - Identify root cause
   - Close vulnerability
   - Patch systems
   - Rotate all credentials

4. **Recover** (8-24 hours)
   - Restore from backups if needed
   - Verify systems integrity
   - Gradually restore normal operations
   - Monitor for recurrence

5. **Communicate** (Ongoing)
   - Notify affected users (within 72 hours per GDPR)
   - Provide guidance (change passwords, etc.)
   - Publish incident report
   - Follow up with monitoring

### Notification Template
```
Subject: Security Alert - Budget Tool

We detected suspicious activity on your account:
- Location: [IP, city, country]
- Time: [timestamp]
- Activity: [description]

If this wasn't you:
1. Change your password immediately
2. Enable two-factor authentication
3. Contact us: security@budgettool.com

Learn more: https://budgettool.com/security
```

---

## Resources & Documentation

### Internal Documentation
- This file: SECURITY_IMPLEMENTATION.md
- Full guide: SECURITY.md
- Architecture: TECHNICAL_ARCHITECTURE.md
- Database: DATABASE_SCHEMA.md

### External Resources
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- npm Security: https://docs.npmjs.com/misc/security
- Node.js Security: https://nodejs.org/en/docs/guides/security/

### Tools
- npm audit: Built-in dependency scanning
- Snyk: Continuous security monitoring
- OWASP ZAP: Free penetration testing
- SSL Labs: Certificate configuration checker

---

## Support & Questions

For security questions or to report vulnerabilities:
- Email: security@budgettool.com
- Do not disclose vulnerabilities publicly
- We commit to responding within 24 hours

---

**Version:** 1.0
**Last Updated:** July 16, 2026
**Maintainer:** Security Team
