# 🐳 Docker Containerization Guide

This document provides comprehensive instructions for running the Family Office Research Agent in a secure, isolated Docker container.

## 🔒 Security & Isolation Features

The containerized version provides enterprise-grade isolation and security:

- **Sandboxed Environment**: Runs in isolated container with minimal host access
- **Read-only Root Filesystem**: Prevents runtime modifications to system files
- **Non-root User**: Runs as dedicated `familyoffice` user (UID 1001)
- **Dropped Privileges**: All unnecessary Linux capabilities removed
- **Resource Limits**: CPU and memory limits prevent resource exhaustion
- **Network Isolation**: Dedicated Docker network with bridge isolation
- **Temporary Filesystems**: `/tmp` and other writable areas use in-memory tmpfs
- **Security Profiles**: Uses `no-new-privileges` and seccomp filters
- **Minimal Attack Surface**: Alpine Linux base image with only essential packages

## 🚀 Quick Start

### 1. Build the Container

```bash
./scripts/docker-build.sh
```

This will:
- Create necessary directories (`reports/`, `logs/`)
- Generate `.env` template file if it doesn't exist
- Build the Docker image with security hardening

### 2. Configure Environment

Edit the `.env` file with your API keys:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual API keys
vi .env  # or use your preferred editor
```

Required environment variables:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Run Research Commands

```bash
# Research a stock
./scripts/docker-run.sh research AAPL

# Chat about a stock
./scripts/docker-run.sh chat TSLA

# Reevaluate existing report
./scripts/docker-run.sh reevaluate MSFT --report ./reports/research-MSFT-2024-01-01.md

# Show help
./scripts/docker-run.sh --help
```

## 📁 File System Layout

### Container Structure

```
/app/                           # Application root (read-only)
├── dist/                      # Compiled JavaScript (read-only)
├── prompts/                   # Prompt templates (read-only)
├── reports/                   # Output reports (writable, mounted)
├── logs/                      # Application logs (writable, mounted)
├── .cache/                    # npm cache (writable, volume)
└── package.json              # Dependencies (read-only)

/tmp/                          # Temporary files (tmpfs, in-memory)
/run/                          # Runtime files (tmpfs, in-memory)
/var/tmp/                      # Variable temp (tmpfs, in-memory)
```

### Host Mounts

```
host_project/reports/    →    /app/reports/     # Research output
host_project/logs/       →    /app/logs/        # Application logs
host_project/.env        →    container env     # Environment variables
```

## 🛠️ Container Management Scripts

### `./scripts/docker-build.sh`
- Builds the Docker image with security hardening
- Creates output directories with proper permissions
- Generates `.env` template if missing
- Uses multi-stage build for minimal image size

### `./scripts/docker-run.sh`
- Runs the application in sandbox mode
- Validates environment and prerequisites
- Provides usage examples and help
- Uses `docker compose run` for automatic cleanup

### `./scripts/docker-shell.sh`
- Opens interactive shell for debugging
- Relaxes some security restrictions for troubleshooting
- Shows container environment information
- **Use only for debugging - not for production**

### `./scripts/docker-cleanup.sh`
- Removes all Docker resources (images, containers, networks, volumes)
- Optionally cleans up local output directories
- Prunes build cache and dangling images
- Interactive confirmation for destructive operations

## 🔧 Advanced Configuration

### Resource Limits

The container is configured with reasonable defaults in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'        # Maximum 2 CPU cores
      memory: 2G         # Maximum 2GB RAM
    reservations:
      cpus: '0.5'        # Minimum 0.5 CPU cores
      memory: 512M       # Minimum 512MB RAM
```

Adjust these based on your system resources and workload requirements.

### Environment Variables

Beyond the required `OPENAI_API_KEY`, you can configure:

```env
# Model selection
OPENAI_MODEL=gpt-4

# Debug logging
DEBUG=true

# Custom API endpoint (for OpenAI-compatible APIs)
OPENAI_BASE_URL=https://api.openai.com/v1

# Request timeout (milliseconds)
REQUEST_TIMEOUT=60000
```

### Volume Management

The container uses several volume types:

1. **Bind Mounts**: Direct host directory access
   - `./reports:/app/reports` - Research outputs
   - `./logs:/app/logs` - Application logs

2. **Named Volumes**: Docker-managed storage
   - `cache:/app/.cache` - npm package cache

3. **Tmpfs Mounts**: In-memory filesystems
   - `/tmp`, `/run`, `/var/tmp` - Temporary files

## 🔍 Debugging & Troubleshooting

### Check Container Status

```bash
# View running containers
docker compose ps

# Check container logs
docker compose logs familyoffice

# Follow logs in real-time
docker compose logs -f familyoffice
```

### Debug Shell Access

```bash
# Open interactive shell
./scripts/docker-shell.sh

# Inside container, check:
whoami                    # Should show 'familyoffice'
node --version           # Should show Node.js version
ls -la /app/             # Application files
env | grep OPENAI        # Environment variables
```

### Common Issues

**Problem**: Permission denied errors
```bash
# Solution: Fix host directory permissions
sudo chown -R $(id -u):$(id -g) reports/ logs/
chmod -R 755 reports/ logs/
```

**Problem**: API key not found
```bash
# Solution: Check .env file exists and is properly formatted
cat .env
# Ensure no extra spaces or quotes around the API key
```

**Problem**: Build fails
```bash
# Solution: Clean and rebuild
./scripts/docker-cleanup.sh
./scripts/docker-build.sh
```

## 🔐 Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use different `.env` files for different environments
- Consider using Docker secrets for production deployments
- Regularly rotate API keys

### Container Security
- The container runs with minimal privileges by design
- All unnecessary capabilities are dropped
- Root filesystem is read-only except for designated areas
- Network access is isolated to prevent lateral movement

### Host Security
- Keep Docker daemon updated
- Use appropriate host firewall rules
- Monitor container resource usage
- Regularly update base images and rebuild containers

### Production Considerations
- Use a proper secrets management system
- Implement container scanning in CI/CD
- Use official base images from trusted sources
- Set up log aggregation and monitoring
- Consider using orchestration platforms (Kubernetes, Docker Swarm)

## 📊 Monitoring & Logs

### Application Logs
```bash
# View recent logs
docker compose logs --tail=50 familyoffice

# Follow logs
docker compose logs -f familyoffice

# Export logs
docker compose logs familyoffice > familyoffice.log
```

### Resource Monitoring
```bash
# Container resource usage
docker stats familyoffice-agent

# Detailed container info
docker inspect familyoffice-agent
```

### Health Checks
The container includes built-in health checks:
```bash
# Check health status
docker compose ps
# Look for "healthy" status
```

## 🚨 Emergency Procedures

### Stop All Containers
```bash
docker compose down
```

### Force Kill and Clean
```bash
docker kill familyoffice-agent 2>/dev/null || true
docker rm familyoffice-agent 2>/dev/null || true
```

### Complete System Reset
```bash
./scripts/docker-cleanup.sh
# Then rebuild: ./scripts/docker-build.sh
```

### Backup Important Data
```bash
# Backup reports
tar -czf reports-backup-$(date +%Y%m%d).tar.gz reports/

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

---

## 📚 Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/security/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Container Security Scanning](https://docs.docker.com/engine/scan/)

For questions or issues specific to the containerized setup, please refer to this document first, then check the main [README.md](./README.md) for application-specific information.
