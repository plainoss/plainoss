# Security Policy

## Supported Versions

PlainOSS actively maintains the `main` branch. Since each web app is continuously deployed, security fixes on `main` are applied immediately.

| Version / Target         | Supported                                   |
| :----------------------- | :------------------------------------------ |
| `main` branch (Web apps) | ✅ Yes                                      |
| Latest Mobile Releases   | ✅ Yes                                      |
| Older Mobile Releases    | ❌ No (Please update to the latest release) |

---

## Privacy & Security Commitments

1. **Local-First & Client-Side Execution**: PlainOSS tools run purely on the user's client device. No user data, sensor streams, camera feeds, or calculation inputs are ever sent to remote servers.
2. **Zero Telemetry / Zero Trackers**: No third-party analytics or tracker scripts are bundled into any tool.
3. **Least Privilege Permissions**: Camera, location, and motion sensor permissions are only requested at runtime when strictly necessary for the tool's core functionality.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in PlainOSS, please report it responsibly:

1. **Private Vulnerability Reporting**: Use the **[Report a vulnerability](https://github.com/plainoss/plainoss/security/advisories/new)** button on GitHub Security tab.
2. **Direct Contact**: If unable to use GitHub Security Advisories, contact the maintainers at `security@plainoss.org`.

Please do **not** open public GitHub issues for security vulnerabilities. We will respond within 48 hours to validate and address the report.
