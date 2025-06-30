# ⚠️ SECURITY WARNING

## CRITICAL SECURITY NOTICE

This tool executes arbitrary TypeScript/JavaScript code from transform files. 

### 🚨 DO NOT USE WITH UNTRUSTED TRANSFORMS

**NEVER:**
- Execute transforms from unknown sources
- Use in production environments without security review
- Run with elevated privileges
- Use in CI/CD pipelines without sandboxing

**ALWAYS:**
- Review all transform files before execution
- Run in isolated environments
- Validate all file paths
- Monitor for suspicious activity

### Known Vulnerabilities

1. **Arbitrary Code Execution**: Transform files can execute any Node.js code
2. **Path Traversal**: File paths are not properly validated
3. **Dependency Vulnerabilities**: See `npm audit` output

### Reporting Security Issues

Please report security vulnerabilities to the maintainers privately.