# Go Security

Threat-model inputs, assets, trust boundaries, and abuse cases before implementation. Apply defense in depth and least privilege; do not claim code is secure without tests and tooling.

## Input and network boundaries

Parameterize SQL and shell commands. Validate length, type, encoding, path roots, URLs, redirects, host allowlists, and content types. Prevent path traversal with canonical/rooted paths; avoid shell interpolation. Protect against SSRF with scheme/host/IP validation, redirect policy, DNS/rebinding awareness, and egress controls. Configure HTTP server `ReadTimeout`, `WriteTimeout`, `IdleTimeout`, body limits, request limits, and rate limits for expensive/auth endpoints.

Use `html/template` for HTML, explicit output encoding, CSRF protection for cookie-auth state changes, and security headers such as CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy as appropriate. Cookies holding auth/session data require `HttpOnly`, `Secure` in production, appropriate `SameSite`, short lifetime, narrow path/domain, rotation, and logout invalidation.

## Cryptography and identity

Use TLS 1.2+ (prefer 1.3), verify SSH host keys, and never use DES, RC4, MD5, SHA-1, AES-ECB, predictable randomness, or `InsecureSkipVerify` for security decisions. Use `crypto/rand` for tokens/nonces/keys, AEAD such as AES-GCM or ChaCha20-Poly1305, Argon2id or bcrypt for passwords, constant-time comparison for secrets, and key rotation with an explicit lifecycle. Validate JWT algorithm, issuer, audience, expiry, and claims; authorize every privileged action, not only login.

## Secrets, logs, dependencies

Load secrets from environment/secret managers, never source or committed config. Do not log passwords, tokens, keys, full cookies, payment data, or unnecessary PII; redact structured fields. Run `govulncheck ./...`, review third-party dependencies/licenses, use `gosec`/configured SAST, `go test -race`, and fuzz parsers/security boundaries. Treat race conditions and unsafe memory as security concerns where they affect authorization or integrity.

## Security review

Check authentication, authorization, tenant isolation, validation, error disclosure, dependency reachability, file/network access, crypto, cookies, rate limits, timeouts, concurrency, and operational secrets. Record residual risks instead of silently accepting them.
