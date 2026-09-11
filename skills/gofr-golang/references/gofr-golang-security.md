# GoFr-Golang: Security

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr security adaptation

Use GoFr's documented configuration-driven authentication and RBAC middleware for identity and access at the edge. Keep authorization decisions that depend on business rules in application command handlers. Load credentials and tokens through GoFr configuration/secret integrations, never source or logs. Apply GoFr health, logging, tracing, and error redaction rules to every security boundary.

## Required GoFr references

- `advanced-guide-authentication.md` — https://gofr.dev/docs/advanced-guide/authentication
- `advanced-guide-rbac.md` — https://gofr.dev/docs/advanced-guide/rbac
- `references-context.md` — https://gofr.dev/docs/references/context
- `guides-auth-in-kubernetes.md` — https://gofr.dev/docs/guides/auth-in-kubernetes
- `quick-start-configuration.md` — https://gofr.dev/docs/quick-start/configuration

## Unified Golang guidance

# Security

This reference consolidates all retained guidance from `golang-security`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a senior Go security engineer. You apply security thinking both when auditing existing code and when writing new code — threats are easier to prevent than to fix.

**Thinking mode:** Reason as thoroughly as possible for security audits and vulnerability analysis — security bugs hide in subtle interactions and deep reasoning catches what surface-level review misses. On Claude Code, use `ultrathink` to trigger extended thinking explicitly.

**Orchestration mode:** Fan out the five vulnerability-domain sub-agents described in Audit mode as a fan-out-then-synthesize workflow for a full-codebase security audit. Parallelism covers more attack surface per pass; the synthesis step deduplicates findings and ranks them by severity. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Review mode** — reviewing a PR for security issues. Start from the changed files, then trace call sites and data flows into adjacent code — a vulnerability may live outside the diff but be triggered by it. Sequential.
- **Audit mode** — full codebase security scan. Launch up to 5 parallel sub-agents, each covering an independent vulnerability domain: (1) injection patterns, (2) cryptography and secrets, (3) web security and headers, (4) authentication and authorization, (5) concurrency safety and dependency vulnerabilities. Aggregate findings, score with DREAD, and report by severity. A large audit produces many independent findings — apply each fix/improvement in its own isolated worktree, so one fix = one worktree = one focused, reviewable, independently revertible PR, instead of one large mixed-concern change.
- **Coding mode** — use when writing new code or fixing a reported vulnerability. Follow the skill's sequential guidance. Optionally launch a background agent to grep for common vulnerability patterns in newly written code while the main agent continues implementing the feature.

**Dependencies:**

- govulncheck: `go install golang.org/x/vuln/cmd/govulncheck@latest`

# Go Security

## Overview

Security in Go follows the principle of **defense in depth**: protect at multiple layers, validate all inputs, use secure defaults, and leverage the standard library's security-aware design. Go's type system and concurrency model provide some inherent protections, but vigilance is still required.

## Security Thinking Model

Before writing or reviewing code, ask three questions:

1. **What are the trust boundaries?** — Where does untrusted data enter the system? (HTTP requests, file uploads, environment variables, database rows written by other services)
2. **What can an attacker control?** — Which inputs flow into sensitive operations? (SQL queries, shell commands, HTML output, file paths, cryptographic operations)
3. **What is the blast radius?** — If this defense fails, what's the worst outcome? (Data leak, RCE, privilege escalation, denial of service)

## Severity Levels

| Level | DREAD | Meaning |
| --- | --- | --- |
| Critical | 8-10 | RCE, full data breach, credential theft — fix immediately |
| High | 6-7.9 | Auth bypass, significant data exposure, broken crypto — fix in current sprint |
| Medium | 4-5.9 | Limited exposure, session issues, defense weakening — fix in next sprint |
| Low | 1-3.9 | Minor info disclosure, best-practice deviations — fix opportunistically |

Levels align with [DREAD scoring](./references/threat-modeling.md).

## Research Before Reporting

Before flagging a security issue, trace the full data flow through the codebase — don't assess a code snippet in isolation.

1. **Trace the data origin** — follow the variable back to where it enters the system. Is it user input, a hardcoded constant, or an internal-only value?
2. **Check for upstream validation** — look for input validation, sanitization, type parsing, or allow-listing earlier in the call chain.
3. **Examine the trust boundary** — if the data never crosses a trust boundary (e.g., internal service-to-service with mTLS), the risk profile is different.
4. **Read the surrounding code, not just the diff** — middleware, interceptors, or wrapper functions may already provide a layer of defense.

**Severity adjustment, not dismissal:** upstream protection does not eliminate a finding — defense in depth means every layer should protect itself. But it changes severity: a SQL concatenation reachable only through a strict input parser is medium, not critical. Always report the finding with adjusted severity and note which upstream defenses exist and what would happen if they were removed or bypassed.

**When downgrading or skipping a finding:** add a brief inline comment (e.g., `// security: SQL concat safe here — input is validated by parseUserID() which returns int`) so the decision is documented, reviewable, and won't be re-flagged by future audits.

## Threat Modeling (STRIDE)

Apply STRIDE to every trust boundary crossing and data flow in your system: **S**poofing (authentication), **T**ampering (integrity), **R**epudiation (audit logging), **I**nformation Disclosure (encryption), **D**enial of Service (rate limiting), **E**levation of Privilege (authorization). Score each threat using DREAD (Damage, Reproducibility, Exploitability, Affected users, Discoverability) to prioritize remediation — Critical (8-10) demands immediate action.

For the full methodology with Go examples, DFD trust boundaries, DREAD scoring, and OWASP Top 10 mapping, see **[Threat Modeling Guide](./references/threat-modeling.md)**.

## Quick Reference

| Severity | Vulnerability | Defense | Standard Library Solution |
| --- | --- | --- | --- |
| Critical | SQL Injection | Parameterized queries separate data from code | `database/sql` with `?` placeholders |
| Critical | Command Injection | Pass args separately, never via shell concatenation | `exec.Command` with separate args |
| High | XSS | Auto-escaping renders user data as text, not HTML/JS | `html/template`, `text/template` |
| High | Path Traversal | Scope untrusted file access to an allowed root | Go 1.24+: use `os.Root`. Pre-Go 1.24: use `filepath.IsLocal` + `filepath.Rel` + separator-aware checks; never rely on `filepath.Clean` + `strings.HasPrefix` alone. |
| Medium | Timing Attacks | Constant-time comparison avoids byte-by-byte leaks | `crypto/subtle.ConstantTimeCompare` |
| High | Crypto Issues | Use vetted algorithms; never roll your own | `crypto/aes`, `crypto/rand` |
| Medium | HTTP Security | TLS + security headers prevent downgrade attacks | `net/http`, configure TLSConfig |
| Low | Missing Headers | HSTS, CSP, X-Frame-Options prevent browser attacks | Security headers middleware |
| Medium | Rate Limiting | Rate limits prevent brute-force and resource exhaustion | `golang.org/x/time/rate`, server timeouts |
| High | Race Conditions | Protect shared state to prevent data corruption | `sync.Mutex`, channels, avoid shared state |

## Detailed Categories

For complete examples, code snippets, and CWE mappings, see:

- **[Cryptography](./references/cryptography.md)** — Algorithms, key derivation, TLS configuration.
- **[Injection Vulnerabilities](./references/injection.md)** — SQL, command, template injection, XSS, SSRF.
- **[Filesystem Security](./references/filesystem.md)** — Path traversal, zip bombs, file permissions, symlinks.
- **[Network/Web Security](./references/network.md)** — SSRF, open redirects, HTTP headers, timing attacks, session fixation.
- **[Cookie Security](./references/cookies.md)** — Secure, HttpOnly, SameSite flags.
- **[Third-Party Data Leaks](./references/third-party.md)** — Analytics privacy risks, GDPR/CCPA compliance.
- **[Memory Safety](./references/memory-safety.md)** — Integer overflow, memory aliasing, `unsafe` usage.
- **[Secrets Management](./references/secrets.md)** — Hardcoded credentials, env vars, secret managers.
- **[Logging Security](./references/logging.md)** — PII in logs, log injection, sanitization.
- **[Threat Modeling Guide](./references/threat-modeling.md)** — STRIDE, DREAD scoring, trust boundaries, OWASP Top 10.
- **[Security Architecture](./references/architecture.md)** — Defense-in-depth, Zero Trust, auth patterns, rate limiting, anti-patterns.

## Code Review Checklist

For the full security review checklist organized by domain (input handling, database, crypto, web, auth, errors, dependencies, concurrency), see **[Security Review Checklist](./references/checklist.md)** — a comprehensive checklist for code review with coverage of all major vulnerability categories.

## Tooling & Verification

### Static Analysis & Linting

Security-relevant linters: `bodyclose`, `sqlclosecheck`, `nilerr`, `errcheck`, `govet`, `staticcheck`. See the `samber/cc-skills-golang@golang-lint` skill for configuration and usage.

For deeper security-specific analysis:

```bash
# Go security checker (SAST)
go get -tool github.com/securego/gosec/v2/cmd/gosec@latest
go tool gosec ./...

# Vulnerability scanner — see golang-dependency-management for full govulncheck usage
go get -tool golang.org/x/vuln/cmd/govulncheck@latest
go tool govulncheck ./...
```

To check the known CVEs of a specific module or version without scanning the whole tree (e.g. when vetting a dependency on pkg.go.dev), → See `samber/cc-skills-golang@golang-pkg-go-dev` skill.

### Security Testing

```bash
# Race detector
go test -race ./...

# Fuzz testing
go test -fuzz=Fuzz
```

## Common Mistakes

| Severity | Mistake | Fix |
| --- | --- | --- |
| High | `math/rand` for tokens | Output is predictable — attacker can reproduce the sequence. Use `crypto/rand` |
| Critical | SQL string concatenation | Attacker can modify query logic. Parameterized queries keep data and code separate |
| Critical | `exec.Command("bash -c")` | Shell interprets metacharacters (`;`, `\|`, `` ` ``). Pass args separately to avoid shell parsing |
| High | Trusting unsanitized input | Validate at trust boundaries — internal code trusts the boundary, so catching bad input there protects everything |
| Critical | Hardcoded secrets | Secrets in source code end up in version history, CI logs, and backups. Use env vars or secret managers |
| Medium | Comparing secrets with `==` | `==` short-circuits on first differing byte, leaking timing info. Use `crypto/subtle.ConstantTimeCompare` |
| Medium | Returning detailed errors | Stack traces and DB errors help attackers map your system. Return generic messages, log details server-side |
| High | Ignoring `-race` findings | Races cause data corruption and can bypass authorization checks under concurrency. Fix all races |
| High | MD5/SHA1 for passwords | Both have known collision attacks and are fast to brute-force. Use Argon2id or bcrypt (intentionally slow, memory-hard) |
| High | AES without GCM | ECB/CBC modes lack authentication — attacker can modify ciphertext undetected. GCM provides encrypt+authenticate |
| Medium | Binding to 0.0.0.0 | Exposes service to all network interfaces. Bind to specific interface to limit attack surface |

## Security Anti-Patterns

| Severity | Anti-Pattern | Why It Fails | Fix |
| --- | --- | --- | --- |
| High | Security through obscurity | Hidden URLs are discoverable via fuzzing, logs, or source | Authentication + authorization on all endpoints |
| High | Trusting client headers | `X-Forwarded-For`, `X-Is-Admin` are trivially forged | Server-side identity verification |
| High | Client-side authorization | JavaScript checks are bypassed by any HTTP client | Server-side permission checks on every handler |
| High | Shared secrets across envs | Staging breach compromises production | Per-environment secrets via secret manager |
| Critical | Ignoring crypto errors | `_, _ = encrypt(data)` silently proceeds unencrypted | Always check errors — fail closed, never open |
| Critical | Rolling your own crypto | Custom encryption hasn't been analyzed by cryptographers | Use `crypto/aes` GCM, `golang.org/x/crypto/argon2` |

See **[Security Architecture](./references/architecture.md)** for detailed anti-patterns with Go code examples.

## Cross-References

See `samber/cc-skills-golang@golang-database`, `samber/cc-skills-golang@golang-safety`, `samber/cc-skills-golang@golang-observability`, `samber/cc-skills-golang@golang-continuous-integration` skills.

- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines

## Additional Resources

- [Go Security Best Practices](https://go.dev/doc/security/best-practices)
- [gosec Security Linter](https://github.com/securego/gosec)
- [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [OWASP Go Secure Coding Practices](https://owasp.org/www-project-go-secure-coding-practices-guide/)


## Source Reference: `golang-security/references/architecture.md`

# Security Architecture Patterns

Defense-in-depth, Zero Trust, and authentication patterns for Go services.

## Table of Contents

- [Defense-in-Depth Layers](#defense-in-depth-layers)
  - [Go Implementation by Layer](#go-implementation-by-layer)
- [Zero Trust Principles](#zero-trust-principles)
- [Authentication Pattern Selection](#authentication-pattern-selection)
  - [JWT Validation — Complete Example](#jwt-validation--complete-example)
  - [Password Hashing — Argon2id](#password-hashing--argon2id)
- [HTTP Security Headers](#http-security-headers)
- [Security Anti-Patterns](#security-anti-patterns)

## Defense-in-Depth Layers

Multiple security controls ensure that failure of one layer doesn't compromise the system:

```
Layer 1: PERIMETER — Rate limiting, DDoS mitigation, WAF
Layer 2: NETWORK  — TLS/mTLS, network segmentation
Layer 3: APPLICATION — Input validation, auth, authz, secure coding
Layer 4: DATA     — Encryption at rest/transit, access controls, backups
```

### Go Implementation by Layer

**Layer 1 — Rate Limiting Middleware:**

```go
import "golang.org/x/time/rate"

// Global rate limiter
func RateLimitMiddleware(rps float64, burst int) func(http.Handler) http.Handler {
    limiter := rate.NewLimiter(rate.Limit(rps), burst)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

**Per-client rate limiting** prevents a single abuser from exhausting the global limit:

```go
type ClientRateLimiter struct {
    mu      sync.Mutex
    clients map[string]*rate.Limiter
    rps     rate.Limit
    burst   int
}

func (crl *ClientRateLimiter) GetLimiter(clientIP string) *rate.Limiter {
    crl.mu.Lock()
    defer crl.mu.Unlock()
    if limiter, exists := crl.clients[clientIP]; exists {
        return limiter
    }
    limiter := rate.NewLimiter(crl.rps, crl.burst)
    crl.clients[clientIP] = limiter
    return limiter
}
```

**Layer 2 — mTLS for Service-to-Service:**

```go
func mTLSConfig(caCertFile, clientCertFile, clientKeyFile string) (*tls.Config, error) {
    caCertPool := x509.NewCertPool()
    caCert, err := os.ReadFile(caCertFile)
    if err != nil { return nil, err }
    caCertPool.AppendCertsFromPEM(caCert)

    cert, err := tls.LoadX509KeyPair(clientCertFile, clientKeyFile)
    if err != nil { return nil, err }

    return &tls.Config{
        Certificates: []tls.Certificate{cert},
        RootCAs:      caCertPool,
        MinVersion:   tls.VersionTLS12,
    }, nil
}
```

**Layer 3 — Request Body Size Limiting:**

```go
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
            next.ServeHTTP(w, r)
        })
    }
}
```

**Layer 4 — Encryption at Rest (AES-GCM):**

Use `crypto/aes` with GCM mode for authenticated encryption. See [Cryptography Security](./cryptography.md) for full `EncryptAESGCM`/`DecryptAESGCM` implementations, algorithm selection guide, and envelope encryption for key rotation.

---

## Zero Trust Principles

| Principle | Implementation |
| --- | --- |
| Verify explicitly | Authenticate and authorize every request — no implicit trust from network location |
| Least privilege | Grant minimum permissions; use short-lived tokens (15min access, 7d refresh) |
| Assume breach | Segment services, encrypt all communication, log all access for anomaly detection |

```go
// Zero Trust middleware: verify identity + permissions on every request
func ZeroTrustMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Verify token
        claims, err := validateJWT(r.Header.Get("Authorization"))
        if err != nil {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        // 2. Verify permissions for this specific resource
        if !hasPermission(claims.Subject, r.Method, r.URL.Path) {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }
        // 3. Audit log
        logger.Info("access_granted",
            "user", claims.Subject,
            "method", r.Method,
            "path", r.URL.Path,
            "ip", r.RemoteAddr,
        )
        ctx := context.WithValue(r.Context(), userClaimsKey, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Authentication Pattern Selection

| Use Case | Recommended Pattern | Go Implementation |
| --- | --- | --- |
| Web application | OAuth 2.0 + PKCE with OIDC | `golang.org/x/oauth2` |
| API authentication | JWT with short expiry + refresh tokens | `github.com/golang-jwt/jwt/v5` |
| Service-to-service | mTLS with certificate rotation | `crypto/tls` with `tls.LoadX509KeyPair` |
| CLI/Automation | API keys with IP allowlisting | Custom middleware with `net.ParseIP` |
| High security | FIDO2/WebAuthn hardware keys | `github.com/go-webauthn/webauthn` |

### JWT Validation — Complete Example

JWT validation must pin the signing algorithm to prevent algorithm confusion attacks (where an attacker switches RS256 to HS256 and signs with the public key):

```go
import "github.com/golang-jwt/jwt/v5"

func validateJWT(authHeader string) (*jwt.RegisteredClaims, error) {
    tokenString := strings.TrimPrefix(authHeader, "Bearer ")
    token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{},
        func(token *jwt.Token) (interface{}, error) {
            // Pin signing algorithm — prevents algorithm confusion
            if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return publicKey, nil
        },
        jwt.WithIssuer("your-issuer"),
        jwt.WithAudience("your-audience"),
        jwt.WithExpirationRequired(),
    )
    if err != nil { return nil, err }
    claims, ok := token.Claims.(*jwt.RegisteredClaims)
    if !ok { return nil, errors.New("invalid claims") }
    return claims, nil
}
```

### Password Hashing — Argon2id

Argon2id is the recommended password hashing algorithm (memory-hard, resists GPU attacks). For algorithm comparison (bcrypt, scrypt, PBKDF2), see [Cryptography Security](./cryptography.md).

```go
import "golang.org/x/crypto/argon2"

type PasswordConfig struct {
    Time    uint32 // iterations
    Memory  uint32 // KB
    Threads uint8
    KeyLen  uint32
    SaltLen uint32
}

// OWASP recommended parameters
var DefaultConfig = PasswordConfig{
    Time: 3, Memory: 64 * 1024, Threads: 4, KeyLen: 32, SaltLen: 16,
}

func HashPassword(password string, cfg PasswordConfig) (string, error) {
    salt := make([]byte, cfg.SaltLen)
    if _, err := rand.Read(salt); err != nil { return "", err }
    hash := argon2.IDKey([]byte(password), salt, cfg.Time, cfg.Memory, cfg.Threads, cfg.KeyLen)
    // Encode salt + hash for storage
    return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version, cfg.Memory, cfg.Time, cfg.Threads,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    ), nil
}
```

---

## HTTP Security Headers

Set on every response via middleware:

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        next.ServeHTTP(w, r)
    })
}
```

| Header | Purpose | Recommended Value |
| --- | --- | --- |
| Content-Security-Policy | Prevents XSS by restricting resource sources | `default-src 'self'; script-src 'self'` |
| X-Frame-Options | Prevents clickjacking via framing | `DENY` |
| X-Content-Type-Options | Prevents MIME-type sniffing | `nosniff` |
| Strict-Transport-Security | Forces HTTPS, prevents protocol downgrade | `max-age=31536000; includeSubDomains` |
| Referrer-Policy | Controls referrer header leakage | `strict-origin-when-cross-origin` |
| Permissions-Policy | Restricts browser features (camera, mic, geolocation) | `geolocation=(), microphone=(), camera=()` |

---

## Security Anti-Patterns

| Anti-Pattern | Why It Fails | Go Fix |
| --- | --- | --- |
| Security through obscurity | Hidden admin URLs are discoverable via fuzzing, logs, or source code | Authentication + authorization on all endpoints |
| Trusting client headers | `X-Forwarded-For`, `X-Is-Admin` — clients forge any header | Server-side identity verification; trust proxy headers only from known load balancers |
| Client-side authorization | JavaScript checks are trivially bypassed by any HTTP client | Server-side `if !user.HasRole("admin")` on every protected handler |
| Shared secrets across environments | Staging breach → production compromise | Per-environment secrets via secret manager |
| Catching and ignoring crypto errors | `_, _ = encrypt(data)` silently proceeds with unencrypted data | Always check error returns — fail closed, never open |
| Rolling your own crypto | Custom encryption hasn't been analyzed by cryptographers | Use `crypto/aes` GCM, `golang.org/x/crypto/argon2` |
| Verbose error responses | Stack traces and DB errors reveal internals to attackers | Generic errors to clients (`http.Error(w, "Internal error", 500)`), detailed logs server-side |

```go
// Anti-pattern: trusting client-provided identity
func badHandler(w http.ResponseWriter, r *http.Request) {
    if r.Header.Get("X-Is-Admin") == "true" { // attacker sets this header
        adminPanel(w, r)
    }
}

// Correct: server-side identity verification
func goodHandler(w http.ResponseWriter, r *http.Request) {
    claims := r.Context().Value(userClaimsKey).(*jwt.RegisteredClaims)
    if !hasRole(claims.Subject, "admin") {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    adminPanel(w, r)
}
```


## Source Reference: `golang-security/references/checklist.md`

# Security Review Checklist

Severity: Critical, High, Medium, Low

## Input Handling

- [ ] **High** All user input validated at system boundaries — internal code trusts the boundary
- [ ] **High** Input uses allowlists, not blocklists — blocklists always miss something
- [ ] **High** Sanitized on output (HTML, SQL, shell) — context-dependent escaping
- [ ] **Medium** Length limits enforced — prevents buffer abuse and DoS

## Database

- [ ] **Critical** SQL queries use parameterized placeholders — keeps data and code separate
- [ ] **Critical** ORM/library protects against SQL injection
- [ ] **Critical** No direct SQL construction with user input

## Code Execution

- [ ] **Critical** No `exec.Command()` with shell arguments — metacharacters enable injection
- [ ] **Critical** No eval, reflection on untrusted input — arbitrary code execution risk
- [ ] **Critical** No deserialization of untrusted data — can trigger arbitrary constructors

## Cryptography

- [ ] **High** Uses `crypto/rand` for security-critical randomness — `math/rand` is predictable
- [ ] **High** Uses vetted algorithms (AES-GCM, Argon2id, bcrypt) — custom crypto hasn't been analyzed
- [ ] **Critical** Proper key management — hardcoded secrets leak through VCS, logs, and backups
- [ ] **Medium** HMAC for message authentication — prevents tampering

## Web Security

- [ ] **High** TLS 1.2+ configured correctly — older versions have known attacks
- [ ] **Medium** Security headers set (HSTS, CSP, X-Frame-Options) — prevents framing, sniffing, downgrade
- [ ] **Medium** CSRF protection for state-changing requests — prevents cross-origin action forgery
- [ ] **Medium** Open redirects validated — attackers use your domain to redirect to phishing
- [ ] **High** XSS protected via `html/template` auto-escaping

## Authentication/Authorization

- [ ] **High** Passwords hashed with Argon2id (preferred) or bcrypt — intentionally slow to resist brute-force
- [ ] **High** Sessions use secure tokens from `crypto/rand`
- [ ] **High** Authorization checked on every privileged action — not just at login
- [ ] **High** JWT tokens validated (algorithm, claims, expiry) — unsigned JWTs bypass auth
- [ ] **High** Expired/invalid sessions invalidated server-side

## Error Handling

- [ ] **Medium** Generic error messages to users — detailed errors help attackers map your system
- [ ] **Medium** Detailed errors logged server-side only
- [ ] **Medium** Stack traces not leaked to clients
- [ ] **Medium** Database errors not exposed — reveals schema and query structure

## Dependency Security

- [ ] **High** `govulncheck` passes — catches known CVEs in your dependency tree
- [ ] **High** Dependencies updated regularly — unpatched deps are the #1 attack vector
- [ ] **Medium** Third-party libraries reviewed for security posture

## HTTP Security Headers

- [ ] **Medium** `Content-Security-Policy` set — restricts resource sources to prevent XSS
- [ ] **Medium** `X-Frame-Options: DENY` — prevents clickjacking via iframe embedding
- [ ] **Medium** `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
- [ ] **Medium** `Strict-Transport-Security` with `includeSubDomains` — forces HTTPS, prevents downgrade
- [ ] **Low** `Referrer-Policy` set — controls referrer header leakage to external sites
- [ ] **Low** `Permissions-Policy` set — restricts browser features (camera, mic, geolocation)

## Rate Limiting & DoS Prevention

- [ ] **Medium** HTTP server has `ReadTimeout`, `WriteTimeout`, `IdleTimeout` — prevents Slowloris
- [ ] **Medium** Request body size limited with `http.MaxBytesReader` — prevents memory exhaustion
- [ ] **Medium** Rate limiting on authentication endpoints — prevents brute-force and credential stuffing
- [ ] **Medium** Rate limiting on expensive operations (search, export, file upload)

## Concurrency

- [ ] **High** `-race` detector passes — races cause data corruption and can bypass auth checks
- [ ] **High** Shared state properly synchronized
- [ ] **High** No data races on global variables


## Source Reference: `golang-security/references/cookies.md`

# Cookie Security Rules

Cookie security is critical for preventing session hijacking and XSS exploitation.

**Rules:**

1. Cookies MUST set `HttpOnly` for session and authentication cookies.
2. Cookies MUST set `Secure` in production (HTTPS only).
3. `SameSite` SHOULD be `Lax` or `Strict` — use `None` only when cross-site access is required.

---

## Table of Contents

- [HTTP-Only Flag Missing — Medium](#http-only-flag-missing--medium)
- [Insecure Cookie Configuration (Missing Secure Flag) — Medium](#insecure-cookie-configuration-missing-secure-flag--medium)
- [SameSite Cookie Protection — Medium](#samesite-cookie-protection--medium)
- [Cookie Prefix Examples — Low](#cookie-prefix-examples--low)
- [Gorilla Sessions Cookie Security — High](#gorilla-sessions-cookie-security--high)
- [Cookie Best Practices Checklist](#cookie-best-practices-checklist)
- [CWE References](#cwe-references)

## HTTP-Only Flag Missing — Medium

Without HttpOnly flag, cookies can be accessed via JavaScript.

**Bad:**

```go
cookie := &http.Cookie{
    Name:  "session",
    Value: sessionID,
    // DON'T: Missing HttpOnly, Secure flags
}
```

**Good:**

```go
cookie := &http.Cookie{
    Name:     "session",
    Value:    sessionID,
    HttpOnly: true,   // Prevents JavaScript access
    Secure:   true,   // Only sends over HTTPS
    SameSite: http.SameSiteStrictMode,
    Path:     "/",
    MaxAge:   3600,
}
```

---

## Insecure Cookie Configuration (Missing Secure Flag) — Medium

Without Secure flag, cookies are sent over unencrypted HTTP.

**Bad:**

```go
http.SetCookie(w, &http.Cookie{
    Name:  "auth_token",
    Value: token,
    // Missing Secure, HttpOnly flags
})
```

**Good:**

```go
http.SetCookie(w, &http.Cookie{
    Name:     "auth_token",
    Value:    token,
    Secure:   true,   // HTTPS only
    HttpOnly: true,   // No JavaScript access
    SameSite: http.SameSiteLaxMode,
    Path:     "/",
    MaxAge:   86400,
    Domain:   "",  // Default: send to exact host only
})
```

---

## SameSite Cookie Protection — Medium

SameSite attribute protects against CSRF attacks.

**Bad:**

```go
cookie := &http.Cookie{
    Name:     "session",
    Value:    token,
    Secure:   true,
    HttpOnly: true,
    // DON'T: Missing SameSite
}
```

**Good:**

```go
// Strict for high-security operations
authCookie := &http.Cookie{
    Name:     "auth",
    Value:    token,
    Secure:   true,
    HttpOnly: true,
    SameSite: http.SameSiteStrictMode,
}

// Lax for most applications
sessionCookie := &http.Cookie{
    Name:     "session",
    Value:    token,
    Secure:   true,
    HttpOnly: true,
    SameSite: http.SameSiteLaxMode,
}

// None for cross-site cookies (requires Secure: true)
crossSiteCookie := &http.Cookie{
    Name:     "analytics",
    Value:    trackingID,
    Secure:   true,
    HttpOnly: true,
    SameSite: http.SameSiteNoneMode,
}
```

---

## Cookie Prefix Examples — Low

Modern cookie prefixes enforce cookie behavior in browsers.

```go
// __Secure- prefix: Requires Secure flag
secureCookie := &http.Cookie{
    Name:     "__Secure-Session",
    Value:    token,
    Secure:   true,   // Required for __Secure-
    HttpOnly: true,
}

// __Host- prefix: Requires Secure, no Domain, origin-bound path
hostCookie := &http.Cookie{
    Name:     "__Host-CSRF",
    Value:    csrfToken,
    Secure:   true,    // Required
    HttpOnly: true,
    Domain:   "",      // Must be empty
    Path:     "/",     // Required
}
```

---

## Gorilla Sessions Cookie Security — High

**Bad:**

```go
import "github.com/gorilla/sessions"
store := sessions.NewCookieStore([]byte("secret-key")) // DON'T: Hardcoded key
```

**Good:**

```go
import "github.com/gorilla/sessions"

store := sessions.NewCookieStore(
    []byte(os.Getenv("SESSION_AUTH_KEY")),   // Use env var
    []byte(os.Getenv("SESSION_ENC_KEY")),   // Separate encryption key
)

store.Options = &sessions.Options{
    Path:     "/",
    MaxAge:   86400 * 30,
    HttpOnly: true,
    Secure:   true,
    SameSite: http.SameSiteStrictMode,
}
```

---

## Cookie Best Practices Checklist

- [ ] Set `HttpOnly: true` for all authentication cookies
- [ ] Set `Secure: true` for all cookies over HTTPS
- [ ] Set appropriate `SameSite` value (Strict/Lax/None)
- [ ] Use short `MaxAge` expiration
- [ ] Avoid setting cookie `Domain` unless necessary
- [ ] Validate cookie values on every request
- [ ] Use cryptographically signed cookies
- [ ] Rotate cookie secrets regularly
- [ ] Clear cookies on logout
- [ ] Use double-submit cookie pattern for CSRF protection

---

## CWE References

- **CWE-1004**: Sensitive Cookie Without 'HttpOnly' Flag
- **CWE-614**: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
- **CWE-352**: Cross-Site Request Forgery (CSRF)
- **CWE-285**: Improper Authorization
- **CWE-565**: Reliance on Cookies without Validation


## Source Reference: `golang-security/references/cryptography.md`

# Cryptography Security Rules

Cryptography vulnerabilities threaten confidentiality and integrity of sensitive data.

**Rules:**

1. TLS MUST use 1.2+.
2. NEVER use DES, RC4, MD5, or SHA1 for security purposes.
3. SSH host keys MUST be verified — NEVER use `InsecureIgnoreHostKey`.
4. Passwords MUST be hashed with Argon2id (preferred) or bcrypt.
5. Security-critical randomness MUST use `crypto/rand`.

---

## Table of Contents

- [Algorithm Selection Guide](#algorithm-selection-guide)
  - [Key Size Requirements](#key-size-requirements)
- [Key Rotation Pattern](#key-rotation-pattern)
- [Common Cryptographic Mistakes](#common-cryptographic-mistakes)
  - [Mistake 1: AES-ECB reveals patterns — High](#mistake-1-aes-ecb-reveals-patterns--high)
  - [Mistake 2: Reusing nonces — Critical](#mistake-2-reusing-nonces--critical)
  - [Mistake 3: Non-constant-time comparison for secrets — Medium](#mistake-3-non-constant-time-comparison-for-secrets--medium)
- [Insecure TLS Configuration — High](#insecure-tls-configuration--high)
- [DES Encryption — High](#des-encryption--high)
- [Insecure SSH Host Key Verification — High](#insecure-ssh-host-key-verification--high)
- [MD5 Hash — High](#md5-hash--high)
- [RC4 Cipher — High](#rc4-cipher--high)
- [SHA1 Hash — Medium](#sha1-hash--medium)
- [Weak Cryptographic Algorithms — Medium](#weak-cryptographic-algorithms--medium)
- [Insufficient Key Strength — Medium](#insufficient-key-strength--medium)
- [Weak Random Number Generators — High](#weak-random-number-generators--high)
- [Weak TLS Versions — High](#weak-tls-versions--high)
- [Password Hashing — High](#password-hashing--high)
- [CWE References](#cwe-references)

## Algorithm Selection Guide

Choose the right algorithm for the job — using the wrong primitive (e.g. SHA256 for passwords) is as dangerous as using a broken one:

| Use Case | Recommended | Avoid | Why |
| --- | --- | --- | --- |
| Symmetric encryption | AES-256-GCM, ChaCha20-Poly1305 | DES, 3DES, AES-ECB, RC4 | ECB reveals patterns; DES/RC4 are broken |
| Password hashing | Argon2id (preferred), bcrypt, scrypt | MD5, SHA-1, plain SHA-256 | Fast hashes enable brute-force; memory-hard functions resist GPU attacks |
| Message authentication | HMAC-SHA256, Poly1305 | HMAC-MD5, HMAC-SHA1 | MD5/SHA1 have known collision weaknesses |
| Digital signatures | Ed25519, ECDSA P-256 | RSA-PKCS1v1.5 | PKCS1v1.5 has padding oracle vulnerabilities |
| Key exchange | X25519, ECDH P-256 | Static RSA key transport | Forward secrecy requires ephemeral keys |
| Random generation | `crypto/rand` | `math/rand` | `math/rand` output is predictable |
| TLS | TLS 1.2+ (prefer 1.3) | TLS 1.0, 1.1, SSL | Known attacks (BEAST, POODLE) on older versions |

### Key Size Requirements

| Algorithm | Minimum Key Size         | Recommended      |
| --------- | ------------------------ | ---------------- |
| RSA       | 2048 bits                | 4096 bits        |
| AES       | 128 bits                 | 256 bits         |
| ECDSA     | P-256 (128-bit security) | P-256 or Ed25519 |

---

## Key Rotation Pattern

Keys should be rotated periodically. Use envelope encryption so rotating the Key Encryption Key (KEK) doesn't require re-encrypting all data:

```go
// Envelope encryption: encrypt data with a DEK, encrypt DEK with KEK
func EnvelopeEncrypt(kek, plaintext []byte) (encryptedDEK, ciphertext []byte, err error) {
    // 1. Generate random Data Encryption Key
    dek := make([]byte, 32)
    if _, err := rand.Read(dek); err != nil {
        return nil, nil, err
    }

    // 2. Encrypt data with DEK
    ciphertext, err = EncryptAESGCM(dek, plaintext)
    if err != nil {
        return nil, nil, err
    }

    // 3. Encrypt DEK with KEK
    encryptedDEK, err = EncryptAESGCM(kek, dek)
    if err != nil {
        return nil, nil, err
    }

    return encryptedDEK, ciphertext, nil
}

func EnvelopeDecrypt(kek, encryptedDEK, ciphertext []byte) ([]byte, error) {
    dek, err := DecryptAESGCM(kek, encryptedDEK)
    if err != nil {
        return nil, err
    }
    return DecryptAESGCM(dek, ciphertext)
}

func EncryptAESGCM(key, plaintext []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil { return nil, err }
    aead, err := cipher.NewGCM(block)
    if err != nil { return nil, err }
    nonce := make([]byte, aead.NonceSize())
    if _, err := rand.Read(nonce); err != nil { return nil, err }
    return aead.Seal(nonce, nonce, plaintext, nil), nil
}

func DecryptAESGCM(key, ciphertext []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil { return nil, err }
    aead, err := cipher.NewGCM(block)
    if err != nil { return nil, err }
    nonceSize := aead.NonceSize()
    if len(ciphertext) < nonceSize {
        return nil, errors.New("ciphertext too short")
    }
    return aead.Open(nil, ciphertext[:nonceSize], ciphertext[nonceSize:], nil)
}
```

When the KEK is rotated, only re-encrypt the DEKs (small), not the data (potentially large).

---

## Common Cryptographic Mistakes

### Mistake 1: AES-ECB reveals patterns — High

ECB encrypts each block independently — identical plaintext blocks produce identical ciphertext blocks, revealing data structure:

```go
// Bad — ECB mode reveals patterns in structured data
block, _ := aes.NewCipher(key)
// Using block.Encrypt directly = ECB mode

// Good — GCM provides authenticated encryption
aead, err := cipher.NewGCM(block) // randomized, authenticated
if err != nil {
    return nil, err
}
nonce := make([]byte, aead.NonceSize())
if _, err := rand.Read(nonce); err != nil {
    return nil, err
}
ciphertext := aead.Seal(nonce, nonce, plaintext, nil)
```

### Mistake 2: Reusing nonces — Critical

A nonce reuse with AES-GCM completely breaks confidentiality and authentication:

```go
// Bad — static or reused nonce
nonce := []byte("fixed_nonce!") // catastrophic with GCM

// Good — random nonce per encryption
nonce := make([]byte, 12) // 96-bit for GCM
if _, err := rand.Read(nonce); err != nil {
    return nil, err
}
```

### Mistake 3: Non-constant-time comparison for secrets — Medium

Comparing secrets with `==` short-circuits on the first differing byte, leaking timing information. See [Network/Web Security — Observable Timing](./network.md) for constant-time comparison patterns using `crypto/subtle`.

---

## Insecure TLS Configuration — High

Using insecure TLS configurations can expose your application to man-in-the-middle attacks.

**Bad:**

```go
transport := &http.Transport{
    TLSClientConfig: &tls.Config{
        InsecureSkipVerify: true, // DON'T: verify certificates
    },
}
```

**Good:**

```go
import "crypto/tls"

func secureConfig() *tls.Config {
    return &tls.Config{
        MinVersion:       tls.VersionTLS12,
        CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
    }
}
```

---

## DES Encryption — High

DES is cryptographically broken.

**Bad:**

```go
import "crypto/des"
block, _ := des.NewCipher(key) // DON'T: broken
```

**Good:**

```go
import "crypto/aes"
block, _ := aes.NewCipher(key)     // OK: AES
cipher.NewGCM(block)              // OK: GCM for auth
```

---

## Insecure SSH Host Key Verification — High

**Bad:**

```go
import "golang.org/x/crypto/ssh"
&ssh.ClientConfig{
    HostKeyCallback: ssh.InsecureIgnoreHostKey(), // DON'T
}
```

**Good:**

```go
import "golang.org/x/crypto/ssh"
&ssh.ClientConfig{
    HostKeyCallback: ssh.FixedHostKey(publicKey),
}
```

---

## MD5 Hash — High

MD5 is collision-prone and weak for security.

**Bad:**

```go
import "crypto/md5"
hash := md5.Sum([]byte(data)) // DON'T: weak
```

**Good:**

```go
// For password hashing:
import "golang.org/x/crypto/argon2"
hash := argon2.IDKey([]byte(pw), salt, 3, 64*1024, 4, 32)

// Or bcrypt (simpler API, no salt management):
import "golang.org/x/crypto/bcrypt"
hash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
if err != nil {
    return nil, err
}

// For general-purpose hashing (not passwords):
import "crypto/sha256"
digest := sha256.Sum256(data)
```

---

## RC4 Cipher — High

RC4 is cryptographically broken.

**Bad:**

```go
import "crypto/rc4"
cipher, _ := rc4.NewCipher(key) // DON'T: broken
```

**Good:**

```go
import "crypto/cipher"
import "crypto/aes"
aead, _ := cipher.NewGCM(block) // OK: AES-GCM

// Or ChaCha20:
import "golang.org/x/crypto/chacha20poly1305"
aead, _ := chacha20poly1305.New(key)
```

---

## SHA1 Hash — Medium

SHA1 provides insufficient collision resistance.

**Bad:**

```go
import "crypto/sha1"
hash := sha1.Sum(data) // DON'T: weak
```

**Good:**

```go
import "crypto/sha256"
hash := sha256.Sum256(data)
```

---

## Weak Cryptographic Algorithms — Medium

**Bad:**

```go
import "crypto/hmac"
import "crypto/md5"
mac := hmac.New(md5.New, key) // DON'T: HMAC-MD5
```

**Good:**

```go
import "crypto/sha256"
mac := hmac.New(sha256.New, key)
```

---

## Insufficient Key Strength — Medium

RSA keys smaller than 2048 bits are insufficient.

**Bad:**

```go
import "crypto/rsa"
key, _ := rsa.GenerateKey(rand.Reader, 1024) // DON'T: too weak
```

**Good:**

```go
key, _ := rsa.GenerateKey(rand.Reader, 4096) // OK: 2048+ bits
```

---

## Weak Random Number Generators — High

`math/rand` is predictable, never use for security.

**Bad:**

```go
import "math/rand"
bytes := make([]byte, 16)
rand.Read(bytes) // DON'T: predictable
```

**Good:**

```go
import "crypto/rand"
_, err := rand.Read(bytes) // OK: cryptographically secure
```

---

## Weak TLS Versions — High

TLS 1.0 and 1.1 have known vulnerabilities.

**Bad:**

```go
import "crypto/tls"
&tls.Config{MinVersion: tls.VersionTLS10} // DON'T
```

**Good:**

```go
&tls.Config{MinVersion: tls.VersionTLS12} // OK
```

---

## Password Hashing — High

Don't use MD5, SHA1, or single-iteration hashes for passwords.

**Bad:**

```go
import "crypto/sha256"
hash := sha256.Sum256([]byte(password)) // DON'T: too fast
```

**Good:**

```go
// Argon2id (preferred) — memory-hard, resists GPU attacks:
import "golang.org/x/crypto/argon2"
key := argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)

// Or bcrypt (simpler API, widely supported):
import "golang.org/x/crypto/bcrypt"
hash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
if err != nil {
    return nil, err
}

// Or PBKDF2 with 600,000+ iterations (Go 1.24+ stdlib):
import "crypto/pbkdf2"
key, err := pbkdf2.Key(sha512.New, password, salt, 600_000, 32)
if err != nil {
    return err
}

// Or scrypt:
import "golang.org/x/crypto/scrypt"
key, err := scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
if err != nil {
    return err
}
```

For Go 1.24+, prefer stdlib `crypto/hkdf`, `crypto/pbkdf2`, and `crypto/sha3`. Use `golang.org/x/crypto/...` fallbacks only for modules targeting older Go versions or for algorithms still outside the standard library.

---

## CWE References

- **CWE-327**: Use of a Broken or Risky Cryptographic Algorithm
- **CWE-331**: Insufficient Entropy
- **CWE-326**: Inadequate Encryption Strength
- **CWE-295**: Improper Certificate Validation
- **CWE-330**: Use of Insufficiently Random Values
- **CWE-916**: Use of Password Hash With Insufficient Computational Effort


## Source Reference: `golang-security/references/filesystem.md`

# Filesystem Security Rules

Filesystem vulnerabilities can lead to unauthorized file access, data leakage, and denial-of-service attacks.

**Rules:**

1. User-controlled file paths MUST be confined to an allowed root.
2. `os.Root` SHOULD be used for scoped file access (Go 1.24+).
3. Zip extraction MUST check for ZipSlip path traversal.
4. Temporary files MUST use `os.CreateTemp` — NEVER predictable names.
5. File permissions MUST be restrictive (0600 for secrets, 0750 for directories).

---

## Table of Contents

- [Directory Traversal — High](#directory-traversal--high)
- [Zip Archive Path Traversal — High](#zip-archive-path-traversal--high)
- [Decompression Bomb — Medium](#decompression-bomb--medium)
- [Insecure Temporary File Creation — Medium](#insecure-temporary-file-creation--medium)
- [Insecure File Permissions — Medium](#insecure-file-permissions--medium)
- [Insecure mkdir — Low](#insecure-mkdir--low)
- [Insecure File Write Permissions — Medium](#insecure-file-write-permissions--medium)
- [Tainted File Read — High](#tainted-file-read--high)
- [CWE References](#cwe-references)

## Directory Traversal — High

Paths like `../../etc/passwd` access files outside intended directory.

**Bad:**

```go
filepath := filepath.Join("/var/www", filename) // DON'T
http.ServeFile(w, r, filepath)
```

**Good (Go 1.24+) — use `os.Root` for safe, scoped directory access:**

```go
root, err := os.OpenRoot("/var/www")
if err != nil { return err }
defer root.Close()
f, err := root.Open(filename) // cannot escape root directory
```

`os.Root` prevents ordinary path traversal at the OS level — all operations (`Open`, `Create`, `Stat`, `OpenFile`, etc.) are confined to the root directory, and symlinks that resolve outside the root are rejected. It is not a full sandbox: it does not by itself block bind mounts, special device files, or all `/proc`-style filesystem behavior. For archive extraction and uploads, still reject special files and choose a root without attacker-controlled mounts.

**Good (pre-Go 1.24 fallback):**

```go
func safeJoin(baseDir, userPath string) (string, error) {
    if userPath == "" || filepath.IsAbs(userPath) || !filepath.IsLocal(userPath) {
        return "", errors.New("invalid relative path")
    }

    full := filepath.Join(baseDir, userPath)

    rel, err := filepath.Rel(baseDir, full)
    if err != nil {
        return "", fmt.Errorf("checking path: %w", err)
    }
    if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
        return "", errors.New("path escapes base directory")
    }

    return full, nil
}
```

This lexical fallback is not a full symlink-resistant substitute for `os.Root`.

**Bad:**

```go
fullPath := filepath.Join(baseDir, filename)
if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(baseDir)) {
    return errors.New("access denied")
}
```

---

## Zip Archive Path Traversal — High

Malicious zip files can escape extraction directory.

**Bad:**

```go
for _, file := range reader.File {
    path := filepath.Join(dest, file.Name) // DON'T: No validation
    file.Create(path)
}
```

**Good (Go 1.24+) — use `os.Root` to scope extraction:**

```go
root, err := os.OpenRoot(dest)
if err != nil { return err }
defer root.Close()
for _, file := range reader.File {
    f, err := root.OpenFile(file.Name, os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil { return err } // rejects paths escaping root
    // ... copy contents ...
    f.Close()
}
```

**Good (pre-Go 1.24 fallback):**

```go
for _, file := range reader.File {
    if !filepath.IsLocal(file.Name) {
        return fmt.Errorf("unsafe archive path: %q", file.Name)
    }

    targetPath, err := safeJoin(dest, file.Name)
    if err != nil {
        return err
    }

    // create parent directories, then write targetPath
    _ = targetPath
}
```

---

## Decompression Bomb — Medium

Tiny compressed files can expand to GBs.

**Bad:**

```go
gr, _ := gzip.NewReader(f)
out, _ := os.Create(dst)
io.Copy(out, gr) // DON'T: No size limits
```

**Good:**

```go
const maxDecompressedSize = 100 * 1024 * 1024 // 100MB limit

var errDecompressedSizeLimitExceeded = errors.New("decompressed size limit exceeded")

type limitedReader struct {
    r    io.Reader
    read int64
}

func (l *limitedReader) Read(p []byte) (int, error) {
    if l.read >= maxDecompressedSize {
        // Return a sentinel error — io.EOF would be treated as success by io.Copy
        return 0, errDecompressedSizeLimitExceeded
    }
    n, err := l.r.Read(p)
    l.read += int64(n)
    return n, err
}

lr := &limitedReader{r: gr}
if _, err := io.Copy(out, lr); err != nil {
    return fmt.Errorf("decompressing: %w", err)
}
```

---

## Insecure Temporary File Creation — Medium

Creating temp files without proper permissions.

**Bad:**

```go
f, _ := os.Create("/tmp/myapp.temp") // DON'T: Predictable name
f.WriteString(data)
```

**Good:**

```go
f, err := os.CreateTemp("", "myapp.*")
defer os.Remove(f.Name())
f.Chmod(0600) // Restrictive permissions
```

---

## Insecure File Permissions — Medium

Opening files with excessive permissions.

**Bad:**

```go
f, _ := os.OpenFile("config.json", os.O_CREATE, 0644) // DON'T: World-readable
```

**Good:**

```go
f, _ := os.OpenFile("config.json", os.O_CREATE, 0600) // OK: Owner only
```

---

## Insecure mkdir — Low

Creating directories with overly permissive permissions.

**Bad:**

```go
os.MkdirAll("/var/myapp/cache", 0777) // DON'T: World-writable
```

**Good:**

```go
os.MkdirAll("/var/myapp/cache", 0750) // OK: Group-writable
```

---

## Insecure File Write Permissions — Medium

Opening files for writing with inappropriate permissions.

**Bad:**

```go
os.OpenFile("app.log", os.O_CREATE, 0666) // DON'T: World-writable
```

**Good:**

```go
os.OpenFile("app.log", os.O_CREATE|os.O_APPEND, 0640) // OK
```

---

## Tainted File Read — High

Reading files based on unvalidated input.

**Bad:**

```go
func readFile(filename string) ([]byte, error) {
    return os.ReadFile(filename) // DON'T: No validation
}
```

**Good (Go 1.24+):**

```go
const allowedDir = "/var/www/public/"

func readFile(filename string) ([]byte, error) {
    root, err := os.OpenRoot(allowedDir)
    if err != nil { return nil, err }
    defer root.Close()
    f, err := root.Open(filename) // cannot escape root directory
    if err != nil { return nil, err }
    defer f.Close()
    return io.ReadAll(f)
}
```

**Good (pre-Go 1.24 fallback):**

```go
const allowedDir = "/var/www/public/"

func readFile(filename string) ([]byte, error) {
    fullPath, err := safeJoin(allowedDir, filename)
    if err != nil {
        return nil, err
    }
    return os.ReadFile(fullPath)
}
```

---

## CWE References

- **CWE-22**: Path Traversal (Directory Traversal)
- **CWE-409**: Zip Bomb Decompression
- **CWE-379**: Insecure Temp File Creation
- **CWE-732**: Incorrect File Permissions


## Source Reference: `golang-security/references/injection.md`

# Injection Security Rules

Injection vulnerabilities allow attackers to execute arbitrary code, queries, or commands.

**Rules:**

1. SQL queries MUST use parameterized placeholders — NEVER concatenate user input.
2. Command execution MUST use `exec.Command` with separate args — NEVER shell interpolation.
3. HTML output MUST use `html/template` for automatic escaping.
4. SSRF: outbound URLs MUST be validated against an allowlist.

---

## Table of Contents

- [SQL Injection — Critical](#sql-injection--critical)
  - [Dynamic IN clauses](#dynamic-in-clauses)
  - [Dynamic column names and ORDER BY](#dynamic-column-names-and-order-by)
  - [Dynamic WHERE filters](#dynamic-where-filters)
  - [Prefer `sqlx` or `pgx` over raw `database/sql`](#prefer-sqlx-or-pgx-over-raw-databasesql)
- [XPath Injection — High](#xpath-injection--high)
- [Code Injection — Critical](#code-injection--critical)
- [Command Injection — Critical](#command-injection--critical)
- [Template Injection — High](#template-injection--high)
- [Cross-Site Scripting (XSS) — High](#cross-site-scripting-xss--high)
- [HTML Tag Injection — High](#html-tag-injection--high)
- [Server-Side Request Forgery (SSRF) — High](#server-side-request-forgery-ssrf--high)
- [Unsafe Deserialization — Critical](#unsafe-deserialization--critical)
- [CWE References](#cwe-references)

## SQL Injection — Critical

Building SQL queries by concatenating user input. Always use prepared statements with placeholders.

**Bad:**

```go
query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", input)
query := "SELECT * FROM users WHERE id = " + id
query := "DELETE FROM orders WHERE id = " + strconv.Itoa(orderID) // safe but inconsistent — use placeholders everywhere
```

**Good:**

```go
// Placeholder syntax varies by driver: $1 (pgx/lib/pq), ? (MySQL/SQLite)
db.QueryRow("SELECT * FROM users WHERE name = $1", input)
db.Exec("DELETE FROM orders WHERE id = $1", orderID)
```

### Dynamic IN clauses

Never build `IN (...)` by joining user strings. Generate numbered placeholders.

**Bad:**

```go
query := fmt.Sprintf("SELECT * FROM users WHERE id IN (%s)", strings.Join(ids, ","))
```

**Good:**

```go
// Build placeholders: $1, $2, $3, ...
placeholders := make([]string, len(ids))
args := make([]any, len(ids))
for i, id := range ids {
    placeholders[i] = fmt.Sprintf("$%d", i+1)
    args[i] = id
}
query := fmt.Sprintf("SELECT * FROM users WHERE id IN (%s)", strings.Join(placeholders, ","))
rows, err := db.Query(query, args...)
```

With `sqlx`:

```go
query, args, err := sqlx.In("SELECT * FROM users WHERE id IN (?)", ids)
query = db.Rebind(query) // converts ? to $1,$2,... for postgres
rows, err := db.Query(query, args...)
```

### Dynamic column names and ORDER BY

Placeholders only work for **values**, not identifiers (table/column names) or SQL keywords. Allowlist identifiers explicitly.

**Bad:**

```go
query := fmt.Sprintf("SELECT * FROM users ORDER BY %s", sortCol) // SQL injection
```

**Good:**

```go
allowed := map[string]string{
    "name": "name", "created": "created_at", "email": "email",
}
col, ok := allowed[sortCol]
if !ok {
    col = "created_at"
}
query := fmt.Sprintf("SELECT * FROM users ORDER BY %s", col) // safe: col is from allowlist
```

### Dynamic WHERE filters

Build queries incrementally; parameterize every user-supplied value.

```go
var conditions []string
var args []any
idx := 1

if name != "" {
    conditions = append(conditions, fmt.Sprintf("name = $%d", idx))
    args = append(args, name)
    idx++
}
if minAge > 0 {
    conditions = append(conditions, fmt.Sprintf("age >= $%d", idx))
    args = append(args, minAge)
    idx++
}

query := "SELECT * FROM users"
if len(conditions) > 0 {
    query += " WHERE " + strings.Join(conditions, " AND ")
}
rows, err := db.Query(query, args...)
```

### Prefer `sqlx` or `pgx` over raw `database/sql`

Libraries like `sqlx` and `pgx` provide safer ergonomics (named parameters, `IN` clause expansion, struct scanning) while still using prepared statements under the hood. They reduce the temptation to fall back to string concatenation for complex queries.

---

## XPath Injection — High

XPath injection allows manipulation of XML data queries.

**Bad:**

```go
xpathQuery := "//user[@username='" + username + "']" // Vulnerable
```

**Good:**

```go
// Use numeric ID
xpathQuery := fmt.Sprintf("//user[@id='%d']", userID)

// Or parse XML without XPath
```

---

## Code Injection — Critical

Generating code from unvalidated user input.

**Bad:**

```go
template := "func handle" + resourceName + "() {...}" // DON'T
```

**Good:**

```go
// Validate resource name matches whitelist
if !allowedResources[resourceName] {
    return errors.New("invalid resource")
}
// Use predefined templates
```

---

## Command Injection — Critical

Passing unvalidated input to shell commands.

**Bad:**

```go
cmd := exec.Command("sh", "-c", "rm -f /tmp/"+filename) // DON'T
```

**Good:**

```go
cmd := exec.Command("rm", "-f", filepath.Join("/tmp", filename))

// Better: validate filename
if filepath.Base(filename) != filename {
    return errors.New("invalid filename")
}
```

---

## Template Injection — High

Using untrusted input in templates.

**Bad:**

```go
data := r.URL.Query().Get("user") // Untrusted input
t.Execute(w, data)
```

**Good:**

```go
// Validate input
user := strings.TrimSpace(r.URL.Query().Get("user"))
if !allowedRoles[role] {
    role = "user"
}
t.Execute(w, data)
```

---

## Cross-Site Scripting (XSS) — High

XSS allows attackers to execute malicious scripts.

**Bad:**

```go
w.Write([]byte(fmt.Sprintf("<div>%s</div>", data))) // DON'T
```

**Good:**

```go
import "html/template"
t := template.Must(template.New("safe").Parse("<div>{{.}}</div>"))
t.Execute(w, data) // Auto-escapes
```

---

## HTML Tag Injection — High

Injecting HTML tags through unvalidated input.

**Bad:**

```go
fmt.Fprintf(w, "<div>Welcome, %s!</div>", input) // DON'T
```

**Good:**

```go
import "html"
escaped := html.EscapeString(input)
fmt.Fprintf(w, "<div>Welcome, %s!</div>", escaped)
```

---

## Server-Side Request Forgery (SSRF) — High

Forcing the server to make requests to unintended endpoints.

**Bad:**

```go
url := r.URL.Query().Get("url")
resp, _ := http.Get(url) // DON'T: No validation
```

**Good:**

```go
u, err := url.Parse(targetURL)
// Block non-HTTP/S protocols
if u.Scheme != "http" && u.Scheme != "https" {
    return errors.New("invalid scheme")
}
// Block internal hosts
if isInternalIP(u.Hostname()) {
    return errors.New("internal host not allowed")
}
// Block metadata endpoints
if strings.Contains(u.Hostname(), "metadata.") {
    return errors.New("metadata endpoint blocked")
}
```

---

## Unsafe Deserialization — Critical

Deserializing untrusted input can lead to resource exhaustion, type confusion, or unsafe object construction.

**Bad:**

```go
dec := gob.NewDecoder(r.Body) // DON'T: gob is not hardened for adversarial input
var user interface{}
dec.Decode(&user)
```

**Good:**

```go
import "encoding/json"
dec := json.NewDecoder(r.Body)
var user User
dec.Decode(&user) // JSON doesn't execute code
// Validate fields
```

---

## CWE References

- **CWE-78**: OS Command Injection
- **CWE-89**: SQL Injection
- **CWE-94**: Code Injection
- **CWE-79**: Cross-site Scripting (XSS)
- **CWE-918**: Server-Side Request Forgery (SSRF)
- **CWE-502**: Deserialization of Untrusted Data
- **CWE-20**: Improper Input Validation


## Source Reference: `golang-security/references/logging.md`

# Logging Security Rules

Logging sensitive information can lead to data exposure and compliance violations.

**Rules:**

1. PII MUST NEVER be logged — filter passwords, tokens, emails, and personal data.
2. Log injection MUST be prevented — sanitize user input before logging.
3. Error messages MUST NOT expose internals to users — log details server-side, return generic messages.

---

## Table of Contents

- [Sensitive Data in Logs — Medium](#sensitive-data-in-logs--medium)
- [Log Injection — Low](#log-injection--low)
- [Information Leakage in Error Messages — Medium](#information-leakage-in-error-messages--medium)
- [General Logger Security — Low](#general-logger-security--low)
- [Log Security Checklist](#log-security-checklist)
- [CWE References](#cwe-references)

## Sensitive Data in Logs — Medium

**Bad:**

```go
type User struct {
    ID       string
    Username string
    Password string
    Token    string
}

func logUserLogin(user *User) {
    log.Printf("User logged in: %+v\n", user)  // DON'T: Logs password, token
}
```

**Good:**

```go
import "log/slog"

func logUserLogin(logger *slog.Logger, user *User) {
    logger.Info("user_login",
        "user_id", user.ID,
        "username", user.Username,
        // Don't log: password, token
    )
}
```

---

## Log Injection — Low

User input in logs can lead to log injection attacks.

**Bad:**

```go
log.Printf("User logged in: %s\n", username)  // DON'T: No sanitization
```

**Good:**

```go
import "log/slog"

// Sanitize user input before logging
func sanitizeLogInput(input string) string {
    // Remove control characters
    var result strings.Builder
    for _, r := range input {
        if !unicode.IsControl(r) || r == '\n' || r == '\t' {
            result.WriteRune(r)
        }
    }
    return result.String()
}

func logUsername(logger *slog.Logger, username string) {
    sanitized := sanitizeLogInput(username)
    logger.Info("user_login", "username", sanitized)
}
```

---

## Information Leakage in Error Messages — Medium

**Bad:**

```go
func handleDatabaseError(err error) error {
    return fmt.Errorf("database error: %v", err)  // DON'T: Leaks internal details
}

func dbErrorToHTTP(err error) {
    http.Error(w, "Error: "+err.Error(), 500)  // DON'T
}
```

**Good:**

```go
func handleDatabaseError(logger *slog.Logger, err error) error {
    // Log detailed error for debugging
    logger.Error("database_error", "error", err.Error())
    // Return generic message to client
    return errors.New("database operation failed")
}

func dbErrorToHTTP(w http.ResponseWriter, logger *slog.Logger, err error) {
    logger.Error("database_error", "error", err.Error())
    http.Error(w, "Internal server error", http.StatusInternalServerError)
}
```

---

## General Logger Security — Low

**Bad:**

```go
import "log"
log.Println("User logged in:", user.ID, password)  // DON'T: Logs password
fmt.Printf("DEBUG: %+v\n", data)  // DON'T: Raw data
```

**Good:**

```go
import "log/slog"

handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level:     slog.LevelInfo,
    AddSource: false,
})
logger := slog.New(handler)

logger.Info("user_login",
    "user_id", userID,
    "ip_address", request.RemoteIP,
)
```

---

## Log Security Checklist

- [ ] No passwords, tokens, or secrets in logs
- [ ] No PII/PHI in production logs
- [ ] Sanitize user input before logging
- [ ] Use structured logging (JSON)
- [ ] Implement log level strategy
- [ ] Separate access logs from error logs
- [ ] Log file permissions restricted (e.g., 600)
- [ ] Log rotation prevents disk exhaustion
- [ ] Generic error messages to clients
- [ ] Detailed errors only in internal logs

---

## CWE References

- **CWE-532**: Insertion of Sensitive Information into Log File
- **CWE-117**: Improper Output Neutralization for Logs
- **CWE-209**: Information Exposure Through an Error Message
- **CWE-200**: Exposure of Sensitive Information
- **CWE-312**: Cleartext Storage of Sensitive Information


## Source Reference: `golang-security/references/memory-safety.md`

# Memory Safety Security Rules

Memory safety vulnerabilities can lead to crashes, data corruption, and security compromises.

**Rules:**

1. Integer overflow MUST be checked at boundaries — NEVER trust unchecked arithmetic on external input.
2. `unsafe` MUST NOT be used in application code — restrict to low-level libraries with thorough review.
3. Data races MUST be detected with `-race` flag in CI.

---

## Table of Contents

- [Integer Overflow — High](#integer-overflow--high)
- [math/big.Rat Issues — Low](#mathbigrat-issues--low)
- [Memory Aliasing Vulnerability — Medium](#memory-aliasing-vulnerability--medium)
- [Use of unsafe Package — High](#use-of-unsafe-package--high)
- [Data Races — High](#data-races--high)
- [Always Run Race Detector](#always-run-race-detector)
- [CWE References](#cwe-references)

## Integer Overflow — High

Integer overflows can cause unexpected behavior and crashes.

**Bad:**

```go
func allocateBuffer(rows, cols int) []byte {
    size := rows * cols  // DON'T: Can overflow
    return make([]byte, size)
}
```

**Good:**

```go
import "math"

func safeMultiply(a, b int) (int, error) {
    if a == 0 || b == 0 {
        return 0, nil
    }
    if a > math.MaxInt/b {
        return 0, errors.New("integer overflow")
    }
    result := a * b
    if result/b != a {
        return 0, errors.New("overflow detected")
    }
    return result, nil
}

func allocateBuffer(rows, cols int) ([]byte, error) {
    size, err := safeMultiply(rows, cols)
    if err != nil {
        return nil, err
    }
    const maxBufferSize = 100 * 1024 * 1024 // 100MB limit
    if size > maxBufferSize {
        return nil, errors.New("buffer size exceeds limit")
    }
    return make([]byte, size), nil
}
```

---

## math/big.Rat Issues — Low

Rat can consume large amounts of memory if denominators grow without bounds.

**Bad:**

```go
import "math/big"

func unsafeFraction(operations int) *big.Rat {
    r := big.NewRat(1, 1)
    for i := 0; i < operations; i++ {
        r.Mul(r, big.NewRat(int64(i+1), int64(i+2)))  // DON'T
    }
    return r  // Could be memory intensive
}
```

**Good:**

```go
const maxRatNumBits = 1000

func safeFraction(operations int) (*big.Rat, error) {
    r := big.NewRat(1, 1)
    for i := 0; i < operations; i++ {
        r.Mul(r, big.NewRat(int64(i+1), int64(i+2)))
        if r.Num().BitLen() > maxRatNumBits || r.Denom().BitLen() > maxRatNumBits {
            return nil, errors.New("fraction precision too large")
        }
    }
    return r, nil
}
```

---

## Memory Aliasing Vulnerability — Medium

Memory aliasing can cause data corruption and race conditions.

**Bad:**

```go
func reverseBytes(data []byte) {
    for i, j := 0, len(data)-1; i < j; i, j = i+1, j-1 {
        data[i], data[j] = data[j], data[i]  // DON'T if slices alias
    }
}
```

**Good:**

```go
import "unsafe"

func checkOverlap(a, b []byte) bool {
    if len(a) == 0 || len(b) == 0 {
        return false
    }
    aStart := uintptr(unsafe.Pointer(&a[0]))
    aEnd := aStart + uintptr(len(a))
    bStart := uintptr(unsafe.Pointer(&b[0]))
    bEnd := bStart + uintptr(len(b))
    return aStart < bEnd && bStart < aEnd
}

func safeCopy(dest, src []byte) {
    if checkOverlap(dest, src) {
        temp := make([]byte, len(src))
        copy(temp, src)
        copy(dest, temp)
    } else {
        copy(dest, src)
    }
}
```

---

## Use of unsafe Package — High

The unsafe package bypasses Go's type safety and memory safety.

**Bad:**

```go
import "unsafe"

func UnsafeStringToBytes(s string) []byte {
    return (*[0x7fffffff]byte)(unsafe.Pointer(
        (*reflect.StringHeader)(unsafe.Pointer(&s)).Data,
    ))[:len(s):len(s)]  // DON'T: memory corruption risk
}

func TypePun(value uint64) float64 {
    return *(*float64)(unsafe.Pointer(&value))  // DON'T
}
```

**Good:**

```go
// Safe string encoding
func StringToBytes(s string) []byte {
    return []byte(s)
}
func BytesToString(b []byte) string {
    return string(b)
}

// Safe type conversion
import "encoding/binary"
func Uint64ToFloat64(value uint64) float64 {
    buf := make([]byte, 8)
    binary.LittleEndian.PutUint64(buf, value)
    bits := binary.LittleEndian.Uint64(buf)
    return math.Float64frombits(bits)
}
```

---

## Data Races — High

Go's race detector is your primary defense.

**Bad:**

```go
type Counter struct {
    value int
}

func (c *Counter) Increment() {
    c.value++  // DON'T: Data race without sync
}
```

**Good:**

```go
import "sync"

type Counter struct {
    value int
    mu    sync.Mutex
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

// Or atomic for simple cases
import "sync/atomic"
type AtomicCounter struct {
    value int64
}
func (c *AtomicCounter) Increment() {
    atomic.AddInt64(&c.value, 1)
}
```

## Always Run Race Detector

```bash
go test -race ./...
go build -race
```

---

## CWE References

- **CWE-190**: Integer Overflow or Wraparound
- **CWE-119**: Improper Restriction of Operations within Bounds
- **CWE-125**: Out-of-bounds Read
- **CWE-787**: Out-of-bounds Write
- **CWE-362**: Race Condition
- **CWE-367**: Time-of-check Time-of-use (TOCTOU)


## Source Reference: `golang-security/references/network.md`

# Network/Web Security Rules

Network and web security vulnerabilities can lead to data leakage and unauthorized access.

**Rules:**

1. Redirects MUST be validated against an allowlist of domains.
2. HTTP servers MUST configure `ReadTimeout`, `WriteTimeout`, and `IdleTimeout`.
3. Pprof endpoints MUST NEVER be exposed publicly.
4. XML parsers MUST disable XXE — reject `<!DOCTYPE` and `<!ENTITY` declarations.

---

## Table of Contents

- [Open Redirect Vulnerability — Medium](#open-redirect-vulnerability--medium)
- [Bind to All Interfaces — Medium](#bind-to-all-interfaces--medium)
- [Slowloris Attack Vulnerability — Medium](#slowloris-attack-vulnerability--medium)
- [Insecure HTTP Server Configuration — Medium](#insecure-http-server-configuration--medium)
- [Observable Timing (Timing Attacks) — Medium](#observable-timing-timing-attacks--medium)
- [Exposed pprof Profiling Endpoints — High](#exposed-pprof-profiling-endpoints--high)
- [XXE Vulnerability — High](#xxe-vulnerability--high)
- [Permissive Regex Validation — Low](#permissive-regex-validation--low)
- [CWE References](#cwe-references)

## Open Redirect Vulnerability — Medium

Redirects to unvalidated URLs can be used for phishing.

**Bad:**

```go
target := r.URL.Query().Get("url")
http.Redirect(w, r, target, http.StatusFound) // DON'T
```

**Good:**

```go
target := r.URL.Query().Get("url")
u, _ := url.Parse(target)
// Only allow http/https
if u.Scheme != "http" && u.Scheme != "https" {
    return errors.New("invalid scheme")
}
// Block javascript/data schemes
if strings.HasPrefix(target, "javascript:") || strings.HasPrefix(target, "data:") {
    return errors.New("blocked scheme")
}
// Check against whitelist
if !isAllowedDomain(u.Host) {
    return errors.New("invalid domain")
}
http.Redirect(w, r, target, http.StatusFound)
```

---

## Bind to All Interfaces — Medium

Binding to 0.0.0.0 exposes services to all network interfaces.

**Bad:**

```go
listener, _ := net.Listen("tcp", "0.0.0.0:8080") // DON'T: Exposes all interfaces
```

**Good:**

```go
// Bind only to localhost
listener, _ := net.Listen("tcp", "127.0.0.1:8080")

// Or specific internal IP
listener, _ := net.Listen("tcp", "10.0.1.5:8080")
```

---

## Slowloris Attack Vulnerability — Medium

Slowloris attacks exhaust connection pools.

**Bad:**

```go
server := &http.Server{
    Addr: ":8080",
    // Missing ReadTimeout, WriteTimeout, IdleTimeout
}
```

**Good:**

```go
server := &http.Server{
    Addr:         ":8080",
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
    MaxHeaderBytes: 1 << 20, // Limit header size to 1MB
}
```

---

## Insecure HTTP Server Configuration — Medium

Running HTTP servers without proper security settings.

**Bad:**

```go
http.ListenAndServe(":8080", handler) // DON'T: No security hardening
```

**Good:**

```go
server := &http.Server{
    Addr:         ":443",
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
    MaxHeaderBytes: 1 << 20,
}
server.ListenAndServeTLS("cert.pem", "key.pem")
```

---

## Observable Timing (Timing Attacks) — Medium

Timing differences can leak sensitive information.

**Bad:**

```go
func checkPassword(input, secret string) bool {
    return input == secret // DON'T: Short-circuit leaks length
}
```

**Good:**

```go
import "crypto/subtle"

// For comparing fixed-length tokens or hashes:
func checkToken(input, expected string) bool {
    // ConstantTimeCompare already handles unequal lengths without leaking timing
    return subtle.ConstantTimeCompare([]byte(input), []byte(expected)) == 1
}

// For passwords, use Argon2id (preferred) or bcrypt — they handle hashing
// and constant-time comparison internally:
// argon2: hash := argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
// bcrypt: err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))

// For HMAC verification:
import "crypto/hmac"
func verifyHMAC(message, messageMAC, key []byte) bool {
    mac := hmac.New(sha256.New, key)
    mac.Write(message)
    expectedMAC := mac.Sum(nil)
    return hmac.Equal(messageMAC, expectedMAC) // Constant-time
}
```

---

## Exposed pprof Profiling Endpoints — High

Debug pprof endpoints expose sensitive runtime information.

**Bad:**

```go
import _ "net/http/pprof" // DON'T: Automatically registers /debug/pprof
http.ListenAndServe(":8080", handler)
```

**Good:**

```go
// Option 1: Use build tags to exclude pprof from production builds
// File: debug_pprof.go
//go:build !production

package main

import _ "net/http/pprof"

// Option 2: Serve pprof on a separate internal-only listener
func startDebugServer() {
    debugMux := http.NewServeMux()
    debugMux.HandleFunc("/debug/pprof/", pprof.Index)
    debugMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    debugMux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    debugMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    debugMux.HandleFunc("/debug/pprof/trace", pprof.Trace)
    go http.ListenAndServe("127.0.0.1:6060", debugMux) // localhost only
}
```

---

## XXE Vulnerability — High

XML parsers that process external entity references.

**Bad:**

```go
decoder := xml.NewDecoder(bytes.NewReader(xmlData))
decoder.Decode(&person) // DON'T: May process external entities
```

**Good:**

```go
decoder := xml.NewDecoder(bytes.NewReader(xmlData))
decoder.Strict = true

// Block DTD declarations
xmlStr := string(xmlData)
if strings.Contains(xmlStr, "<!DOCTYPE") || strings.Contains(xmlStr, "<!ENTITY") {
    return errors.New("XML contains DTD - potential XXE")
}
decoder.Decode(&person)
```

---

## Permissive Regex Validation — Low

Weak regex validation can allow malicious input.

**Bad:**

```go
matched, _ := regexp.MatchString(`.+@.+\..+`, email) // DON'T: Too permissive
```

**Good:**

```go
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
if !emailRegex.MatchString(email) {
    return errors.New("invalid email")
}
// Also block injection patterns
```

---

## CWE References

- **CWE-601**: Open Redirect
- **CWE-208**: Observable Timing Discrepancy
- **CWE-611**: Improper Restriction of XML External Entity Reference
- **CWE-770**: Allocation of Resources Without Limits
- **CWE-20**: Improper Input Validation
- **CWE-200**: Exposure of Sensitive Information


## Source Reference: `golang-security/references/secrets.md`

# Secrets Management Security Rules

Hardcoded secrets, credentials, and sensitive data in source code is a major security vulnerability.

**Rules:**

1. Secrets MUST be loaded from environment variables or secret managers.
2. NEVER commit secrets to VCS.
3. `.gitignore` MUST exclude secret files (`.env`, `*.key`, `*.pem`).

---

## Table of Contents

- [Hardcoded Secrets and Credentials — Critical](#hardcoded-secrets-and-credentials--critical)
- [Hardcoded Database Passwords — Critical](#hardcoded-database-passwords--critical)
- [Secrets Storage Best Practices](#secrets-storage-best-practices)
  - [Environment Variables](#environment-variables)
  - [Secret Managers](#secret-managers)
  - [.gitignore Patterns](#gitignore-patterns)
- [Secret Detection Patterns](#secret-detection-patterns)
- [CWE References](#cwe-references)

## Hardcoded Secrets and Credentials — Critical

**Bad:**

```go
const (
    AWS_ACCESS_KEY    = "AKIAIOSFODNN7EXAMPLE"  // DON'T
    AWS_SECRET_KEY    = "wJalrXUtnFEMI/K7MDENG"  // DON'T
    DATABASE_PASSWORD = "SuperSecret123!"         // DON'T
    JWT_SECRET        = "my-super-secret-jwt-key" // DON'T
)

var config = Config{
    APIKey:  "abc123-xyz789-secret-key", // DON'T
    Secret:  "my-super-secret-value",    // DON'T
    DatabaseURL: "user:passw0rd!@localhost:5432/db", // DON'T
}
```

**Good:**

```go
import "os"

type Config struct {
    AWSAccessKey     string
    AWSSecretKey     string
    DatabasePassword string
    JWTSecret        string
}

func LoadConfig() (*Config, error) {
    cfg := &Config{
        AWSAccessKey:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretKey:     os.Getenv("AWS_SECRET_ACCESS_KEY"),
        DatabasePassword: os.Getenv("DATABASE_PASSWORD"),
        JWTSecret:        os.Getenv("JWT_SECRET"),
    }

    if cfg.JWTSecret == "" {
        return nil, errors.New("JWT_SECRET is required")
    }
    return cfg, nil
}
```

---

## Hardcoded Database Passwords — Critical

**Bad:**

```go
// MySQL
dsn := "user:Password123!@tcp(localhost:3306)/dbname" // DON'T

// PostgreSQL
dsn := "user=postgres password=P@ssw0rd! dbname=mydb host=localhost" // DON'T
```

**Good:**

```go
// MySQL
func connectMySQL() (*sql.DB, error) {
    user := os.Getenv("DB_USER")
    password := os.Getenv("DB_PASSWORD")
    if password == "" {
        return nil, errors.New("DB_PASSWORD required")
    }
    host := getEnvWithDefault("DB_HOST", "localhost")
    port := getEnvWithDefault("DB_PORT", "3306")
    addr := net.JoinHostPort(host, port)
    dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s",
        user, password, addr, getEnvWithDefault("DB_NAME", "mydb"))
    return sql.Open("mysql", dsn)
}

// PostgreSQL
func connectPostgres() (*sql.DB, error) {
    connStr := os.Getenv("DATABASE_URL")
    if connStr == "" {
        return nil, errors.New("DATABASE_URL required")
    }
    return sql.Open("postgres", connStr)
}
```

---

## Secrets Storage Best Practices

### Environment Variables

```go
type EnvSecretLoader struct{}

func (l *EnvSecretLoader) Load(required []string) (map[string]string, error) {
    secrets := make(map[string]string)
    missing := []string{}
    for _, name := range required {
        value := os.Getenv(name)
        if value == "" {
            missing = append(missing, name)
            continue
        }
        secrets[name] = value
    }
    if len(missing) > 0 {
        return nil, fmt.Errorf("missing: %v", missing)
    }
    return secrets, nil
}
```

### Secret Managers

```go
type SecretManager interface {
    GetSecret(name string) (string, error)
}

// AWS Secrets Manager
type AWSSecretsManager struct {
    client *secretsmanager.Client
}

func (m *AWSSecretsManager) GetSecret(name string) (string, error) {
    result, err := m.client.GetSecretValue(context.TODO(), &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(name),
    })
    if err != nil {
        return "", err
    }
    if result.SecretString != nil {
        return *result.SecretString, nil
    }
    return string(result.SecretBinary), nil
}
```

### .gitignore Patterns

```
# Secrets
.env
.env.local
.env.*.local
*.key
*.pem
*.p12
*.pfx
secrets/
credentials/
```

---

## Secret Detection Patterns

| Pattern         | Example                         |
| --------------- | ------------------------------- |
| API Keys        | `Key = "sk_live_..."`           |
| Passwords       | `password = "..."`              |
| Tokens          | `token = "..."`                 |
| Private Keys    | `BEGIN PRIVATE KEY`             |
| AWS Credentials | `AWS_ACCESS_KEY_ID = "AKIA..."` |
| JWT Secrets     | `jwtSecret = "..."`             |

---

## CWE References

- **CWE-798**: Use of Hard-coded Credentials
- **CWE-312**: Cleartext Storage of Sensitive Information
- **CWE-532**: Insertion of Sensitive Information into Log File
- **CWE-359**: Exposure of Private Personal Information


## Source Reference: `golang-security/references/third-party.md`

# Third-Party Data Leak Rules

Third-party monitoring and analytics services can inadvertently transmit sensitive user data to external systems.

**Rules:**

1. PII MUST be filtered before sending to third-party services.
2. Error tracking MUST NOT receive raw user data — use `BeforeSend` hooks to redact.

---

## Table of Contents

- [Overview](#overview)
- [Common Vulnerable Services](#common-vulnerable-services)
- [Error Tracking Services — Medium](#error-tracking-services--medium)
- [Analytics/Monitoring Services — Medium](#analyticsmonitoring-services--medium)
- [Data Filtering Layer](#data-filtering-layer)
- [Review Checklist](#review-checklist)
- [CWE References](#cwe-references)

## Overview

These rules detect Go code that sends data to third-party services. Always review what data is being transmitted and ensure it complies with privacy regulations (GDPR, CCPA, etc.).

---

## Common Vulnerable Services

| Service          | Risk                                                  |
| ---------------- | ----------------------------------------------------- |
| Airbrake         | Error tracking - sensitive data may be sent           |
| Bugsnag          | Error tracking - sensitive data exposure              |
| Sentry           | Error tracking - sensitive data in breadcrumbs/events |
| Rollbar          | Error tracking - sensitive data leaks                 |
| Honeybadger      | Error tracking - sensitive data leaks                 |
| New Relic        | Monitoring - sensitive data exposure                  |
| Datadog          | Monitoring - sensitive data in telemetry              |
| OpenTelemetry    | Observability - sensitive data in traces/metrics      |
| Google Analytics | Analytics - PII tracking risks                        |
| Algolia          | Search API - data exfiltration risks                  |
| Segment          | Analytics - PII tracking risks                        |
| BigQuery         | Analytics - sensitive data in queries                 |
| ClickHouse       | Database - sensitive data queries                     |
| Elasticsearch    | Search engine - sensitive data in queries             |

---

## Error Tracking Services — Medium

**Bad:**

```go
import "github.com/getsentry/sentry-go"

sentry.CaptureException(err) // DON'T: Captures full request context
```

**Good:**

```go
sentry.Init(sentry.ClientOptions{
    Dsn: "https://xxx@sentry.io/123",
    RequestHeaders: []string{"Accept", "User-Agent"},
    BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        // Remove sensitive headers
        if event.Request != nil {
            delete(event.Request.Headers, "Authorization")
            delete(event.Request.Headers, "Cookie")
        }
        return event
    },
})
```

---

## Analytics/Monitoring Services — Medium

**Bad:**

```go
analytics.Track("user_signed_up", analytics.Properties{
    "email":   user.Email,   // DON'T: PII!
    "phone":   user.Phone,   // DON'T: PII!
    "address": user.Address, // DON'T: PII!
})
```

**Good:**

```go
analytics.Track("user_signed_up", analytics.Properties{
    "user_id":        user.ID,          // OK: Internal identifier
    "plan":           user.Plan,        // OK: Business data
    "country":        user.CountryCode, // OK: Non-identifying
})

// Hash PII for correlation
func hashEmail(email string) string {
    h := sha256.New()
    h.Write([]byte(email))
    return hex.EncodeToString(h.Sum(nil))[:8]
}
```

---

## Data Filtering Layer

```go
type DataFilter struct {
    sensitiveFields []string
}

func NewDataFilter() *DataFilter {
    return &DataFilter{
        sensitiveFields: []string{
            "password", "token", "secret", "key", "email",
            "phone", "address", "ssn", "credit_card", "bank_account",
        },
    }
}

func (f *DataFilter) Filter(data map[string]interface{}) map[string]interface{} {
    result := make(map[string]interface{})
    for k, v := range data {
        keyLower := strings.ToLower(k)
        isSensitive := false
        for _, field := range f.sensitiveFields {
            if strings.Contains(keyLower, field) {
                isSensitive = true
                break
            }
        }
        if isSensitive {
            result[k] = "[REDACTED]"
        } else {
            result[k] = v
        }
    }
    return result
}
```

---

## Review Checklist

Before integrating any third-party service:

- [ ] Identify what data is being sent
- [ ] Remove any PII/PHI from transmitted data
- [ ] Review data residency requirements
- [ ] Implement data retention policies
- [ ] Set up data export logging/auditing
- [ ] Configure error handling to avoid data exposure
- [ ] Review terms of service for data usage
- [ ] Implement user consent management
- [ ] Support data deletion requests
- [ ] Conduct regular data flow audits

---

## CWE References

- **CWE-200**: Exposure of Sensitive Information
- **CWE-359**: Exposure of Private Personal Information
- **CWE-201**: Information Exposure Through Sent Data


## Source Reference: `golang-security/references/threat-modeling.md`

# Threat Modeling Guide

Systematic methodology for identifying and prioritizing security threats in Go applications.

## Table of Contents

- [STRIDE Methodology](#stride-methodology)
  - [STRIDE per Element Matrix](#stride-per-element-matrix)
  - [Go-Specific STRIDE Analysis](#go-specific-stride-analysis)
- [DREAD Risk Scoring](#dread-risk-scoring)
  - [Example: SQL Injection in Login Handler](#example-sql-injection-in-login-handler)
- [Trust Boundary Analysis](#trust-boundary-analysis)
- [OWASP Top 10 Mapping for Go](#owasp-top-10-mapping-for-go)
- [Conducting a Threat Model](#conducting-a-threat-model)
- [Vulnerability Severity Matrix](#vulnerability-severity-matrix)

## STRIDE Methodology

Apply STRIDE to every element in your system's data flow diagram. Each element type is susceptible to specific threat categories:

### STRIDE per Element Matrix

| DFD Element                           | S   | T   | R   | I   | D   | E   |
| ------------------------------------- | --- | --- | --- | --- | --- | --- |
| External Entity (user, API client)    | X   |     | X   |     |     |     |
| Process (HTTP handler, gRPC service)  | X   | X   | X   | X   | X   | X   |
| Data Store (database, cache, file)    |     | X   | X   | X   | X   |     |
| Data Flow (HTTP, gRPC, message queue) |     | X   |     | X   | X   |     |

### Go-Specific STRIDE Analysis

**Spoofing** — Can an attacker impersonate a user or service?

```go
// Check: Is every endpoint behind authentication?
// Check: Are JWT tokens validated (algorithm, issuer, expiry)?
// Check: Is mTLS configured for service-to-service calls?
r.Use(authMiddleware) // every route group must have auth
```

**Tampering** — Can data be modified in transit or at rest?

```go
// Check: Are all external inputs validated?
// Check: Is HMAC used for webhook/callback verification?
mac := hmac.New(sha256.New, key)
mac.Write(payload)
expected := mac.Sum(nil)
if !hmac.Equal(signature, expected) {
    return errors.New("tampered payload")
}
```

**Repudiation** — Can a user deny performing an action?

```go
// Check: Are all security-relevant actions logged with structured data?
logger.Info("action_performed",
    "user_id", userID,
    "action", "delete_account",
    "ip", r.RemoteAddr,
    "timestamp", time.Now().UTC(),
)
```

**Information Disclosure** — Can sensitive data leak?

```go
// Check: Are error messages generic to clients?
// Check: Are logs free of PII?
// Check: Is TLS configured (no InsecureSkipVerify)?
// Check: Are debug endpoints (pprof) disabled in production?
```

**Denial of Service** — Can the service be overwhelmed?

```go
// Check: Are timeouts set on the HTTP server?
// Check: Are request body sizes limited?
// Check: Is rate limiting in place?
server := &http.Server{
    ReadTimeout:    5 * time.Second,
    WriteTimeout:   10 * time.Second,
    MaxHeaderBytes: 1 << 20, // 1MB
}
```

**Elevation of Privilege** — Can a user gain unauthorized access?

```go
// Check: Is authorization checked server-side on every request?
// Check: Are object references validated (no IDOR)?
// Check: Are admin routes properly protected?
if !user.HasPermission("admin:write") {
    http.Error(w, "Forbidden", http.StatusForbidden)
    return
}
```

---

## DREAD Risk Scoring

Score each identified threat to prioritize remediation:

| Factor | 1-3 (Low) | 4-6 (Medium) | 7-10 (High) |
| --- | --- | --- | --- |
| **D**amage | Minor info disclosure | Partial data breach | Full system compromise, data destruction |
| **R**eproducibility | Timing-dependent, hard to reproduce | Reproducible with some effort | Always reproducible, automated tools exist |
| **E**xploitability | Custom exploit, advanced skills needed | Basic tools available | No skills required, public exploit exists |
| **A**ffected users | Individual user | Subset of users | All users |
| **D**iscoverability | Requires insider knowledge | Found via scanning | Publicly documented, obvious |

**Score** = (D + R + E + A + D) / 5. Risk levels: **8-10 Critical**, **6-7.9 High**, **4-5.9 Medium**, **1-3.9 Low**.

### Example: SQL Injection in Login Handler

| Factor          | Score | Justification                              |
| --------------- | ----- | ------------------------------------------ |
| Damage          | 9     | Full database access, credential theft     |
| Reproducibility | 9     | Consistent, automated tools exist (sqlmap) |
| Exploitability  | 8     | Well-documented attack, easy tooling       |
| Affected Users  | 10    | All users with accounts                    |
| Discoverability | 7     | Automated scanners detect easily           |

**DREAD Score: 8.6 — Critical. Immediate remediation required.**

---

## Trust Boundary Analysis

Map where untrusted data enters your Go application:

```
                        ┌─────────────────────────────────────┐
                        │           TRUST BOUNDARY             │
                        │                                      │
Internet ──→ [LB/WAF] ──→ [Go HTTP Server]                   │
                        │        │                             │
                        │   [Middleware]                        │
                        │   - Auth (JWT/session)               │
                        │   - Rate limiting                    │
                        │   - Input validation                 │
                        │   - Security headers                 │
                        │        │                             │
                        │   [Service Layer] ──→ [Cache]        │
                        │        │                             │
                        │   [Database] (parameterized queries) │
                        │                                      │
                        └──────────┬──────────────────────────┘
                                   │
                          External APIs (mTLS)
```

Every arrow crossing the trust boundary needs:

1. **Authentication** — who is making this request?
2. **Input validation** — is the data well-formed and within bounds?
3. **Authorization** — is this caller allowed to perform this action on this resource?

---

## OWASP Top 10 Mapping for Go

| Rank | Vulnerability | STRIDE | Go Defense |
| --- | --- | --- | --- |
| A01 | Broken Access Control | E | Server-side authz middleware, RBAC, IDOR checks |
| A02 | Cryptographic Failures | I | `crypto/aes` GCM, `crypto/rand`, TLS 1.2+ |
| A03 | Injection | T, E | `database/sql` placeholders, `exec.Command` separate args, `html/template` |
| A04 | Insecure Design | All | Threat modeling with STRIDE, defense-in-depth |
| A05 | Security Misconfiguration | I, E | Server timeouts, TLS config, no `InsecureSkipVerify`, no exposed pprof |
| A06 | Vulnerable Components | All | `govulncheck`, Dependabot/Renovate, `go.sum` verification |
| A07 | Authentication Failures | S, E | Argon2id/bcrypt, JWT validation (algorithm pinning), MFA |
| A08 | Software/Data Integrity | T | Module checksums (`go.sum`), signed releases, CI verification |
| A09 | Logging Failures | R | Structured logging (`log/slog`), audit trails, no PII |
| A10 | SSRF | I, T | URL allowlists, block internal IPs and metadata endpoints |

---

## Conducting a Threat Model

1. **Scope** — identify system boundaries, assets to protect, and threat actors
2. **Diagram** — draw a data flow diagram with trust boundaries (external entities, processes, data stores, data flows)
3. **STRIDE** — apply STRIDE to each DFD element using the matrix above
4. **Score** — rate each threat with DREAD
5. **Prioritize** — fix Critical/High first; document accepted risks with explicit justification
6. **Verify** — run `gosec ./...`, `govulncheck ./...`, `go test -race ./...` to validate mitigations
7. **Iterate** — update the model when the system changes (new endpoints, new data flows, new integrations)

---

## Vulnerability Severity Matrix

Use when no DREAD data is available — cross-reference impact with exploitability:

| Impact \ Exploitability | Easy     | Moderate | Difficult |
| ----------------------- | -------- | -------- | --------- |
| Critical                | Critical | Critical | High      |
| High                    | Critical | High     | Medium    |
| Medium                  | High     | Medium   | Low       |
| Low                     | Medium   | Low      | Low       |

