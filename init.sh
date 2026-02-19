#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
#  MindCare — Project Initialization Script
# ─────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ERRORS=()
WARNINGS=()

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD}  MindCare — Project Setup${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

ok()   { echo -e "  ${GREEN}✔${NC}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; WARNINGS+=("$1"); }
fail() { echo -e "  ${RED}✖${NC}  $1"; ERRORS+=("$1"); }
info() { echo -e "  ${CYAN}→${NC}  $1"; }
section() { echo ""; echo -e "${BOLD}▸ $1${NC}"; }

# ─── 1. CLI TOOLS ────────────────────────────

section "Checking required CLI tools"

# Node.js — minimum v18, recommended v20
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 20 ]; then
    ok "Node.js v$NODE_VERSION (required: >=20)"
  elif [ "$NODE_MAJOR" -ge 18 ]; then
    warn "Node.js v$NODE_VERSION — works, but v20 is recommended (functions require node=20)"
  else
    fail "Node.js v$NODE_VERSION is too old — install v20+ from https://nodejs.org"
  fi
else
  fail "Node.js not found — install v20+ from https://nodejs.org"
fi

# npm
if command -v npm &>/dev/null; then
  NPM_VERSION=$(npm --version)
  ok "npm v$NPM_VERSION"
else
  fail "npm not found — it ships with Node.js, check your installation"
fi

# Firebase CLI
if command -v firebase &>/dev/null; then
  FB_VERSION=$(firebase --version 2>/dev/null)
  ok "Firebase CLI v$FB_VERSION"
else
  warn "Firebase CLI not found — install with: npm install -g firebase-tools"
  warn "Required for deploy, emulators, and rules management"
fi

# Git
if command -v git &>/dev/null; then
  ok "git $(git --version | awk '{print $3}')"
else
  warn "git not found — recommended for version control"
fi

# ─── 2. ENVIRONMENT FILE ─────────────────────

section "Checking environment configuration"

if [ -f ".env" ]; then
  ok ".env file exists"

  # Verify each required variable is set and non-empty
  REQUIRED_VARS=(
    VITE_FIREBASE_API_KEY
    VITE_FIREBASE_AUTH_DOMAIN
    VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET
    VITE_FIREBASE_MESSAGING_SENDER_ID
    VITE_FIREBASE_APP_ID
    VITE_ENCRYPTION_KEY
  )

  ALL_VARS_OK=true
  for VAR in "${REQUIRED_VARS[@]}"; do
    VALUE=$(grep -E "^${VAR}=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")
    if [ -z "$VALUE" ] || [[ "$VALUE" == *"your_"* ]] || [[ "$VALUE" == *"_here"* ]]; then
      fail "  $VAR is missing or still has placeholder value"
      ALL_VARS_OK=false
    else
      ok "  $VAR is set"
    fi
  done

  # Warn if encryption key looks weak (< 20 chars)
  ENC_KEY=$(grep -E "^VITE_ENCRYPTION_KEY=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [ "${#ENC_KEY}" -lt 20 ] && [ -n "$ENC_KEY" ] && [[ "$ENC_KEY" != *"your_"* ]]; then
    warn "VITE_ENCRYPTION_KEY is short (${#ENC_KEY} chars) — use at least 32 random characters"
  fi
else
  info "No .env file found — creating one from .env.example"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    warn ".env created from .env.example — fill in your Firebase credentials before running"
    info "Edit .env and replace all placeholder values with your real Firebase project config"
    info "Get your config from: Firebase Console → Project Settings → Your apps → Web app"
  else
    fail ".env.example not found — cannot create .env automatically"
  fi
fi

# ─── 3. SENSITIVE FILES CHECK ────────────────

section "Checking for sensitive files that must not be committed"

SENSITIVE_FILES=(
  "serviceAccountKey.json"
  ".env"
)

for FILE in "${SENSITIVE_FILES[@]}"; do
  if [ -f "$FILE" ]; then
    if git -C . check-ignore -q "$FILE" 2>/dev/null; then
      ok "$FILE exists and is gitignored ✓"
    else
      fail "$FILE exists but is NOT in .gitignore — add it immediately to avoid leaking secrets"
    fi
  fi
done

# Warn if serviceAccountKey.json is missing (needed for scripts/)
if [ ! -f "serviceAccountKey.json" ]; then
  warn "serviceAccountKey.json not found — needed only for admin scripts in scripts/"
  info "Generate one from: Firebase Console → Project Settings → Service accounts → Generate new private key"
fi

# ─── 4. INSTALL DEPENDENCIES ─────────────────

section "Installing dependencies"

info "Installing root dependencies..."
if npm install --silent 2>/dev/null; then
  ok "Root dependencies installed"
else
  fail "npm install failed for root — check error output above"
fi

info "Installing Cloud Functions dependencies..."
if (cd functions && npm install --silent 2>/dev/null); then
  ok "Functions dependencies installed"
else
  fail "npm install failed for functions/"
fi

# ─── 5. BUILD CHECK ──────────────────────────

section "Verifying build"

info "Running TypeScript + Vite build..."
if npm run build --silent 2>/dev/null; then
  ok "Frontend build succeeded"
else
  fail "Frontend build failed — run 'npm run build' to see errors"
fi

info "Building Cloud Functions..."
if (cd functions && npm run build --silent 2>/dev/null); then
  ok "Functions build succeeded"
else
  fail "Functions build failed — run 'cd functions && npm run build' to see errors"
fi

# ─── 6. FIREBASE LOGIN CHECK ─────────────────

section "Checking Firebase authentication"

if command -v firebase &>/dev/null; then
  FB_USER=$(firebase login:list 2>/dev/null | grep -E "@" | head -1 | tr -d ' ' || true)
  if [ -n "$FB_USER" ]; then
    ok "Logged in to Firebase as $FB_USER"
  else
    warn "Not logged in to Firebase — run: firebase login"
  fi

  # Check active project
  FB_PROJECT=$(firebase use 2>/dev/null | grep -oE '[a-z0-9-]+' | head -1 || true)
  if [ -n "$FB_PROJECT" ]; then
    ok "Active Firebase project: $FB_PROJECT"
  else
    warn "No active Firebase project — run: firebase use <your-project-id>"
  fi
fi

# ─── 7. SUMMARY ──────────────────────────────

echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✔ All checks passed — project is ready!${NC}"
  echo ""
  echo -e "  Run ${BOLD}npm run dev${NC} to start the development server"
  echo -e "  Run ${BOLD}npm run firebase:emulators${NC} to start Firebase emulators"

elif [ ${#ERRORS[@]} -eq 0 ]; then
  echo -e "${YELLOW}${BOLD}  ⚠ Setup complete with ${#WARNINGS[@]} warning(s)${NC}"
  echo ""
  for W in "${WARNINGS[@]}"; do echo -e "  ${YELLOW}•${NC} $W"; done
  echo ""
  echo -e "  Run ${BOLD}npm run dev${NC} to start the development server"

else
  echo -e "${RED}${BOLD}  ✖ Setup failed — ${#ERRORS[@]} error(s) must be fixed${NC}"
  echo ""
  for E in "${ERRORS[@]}"; do echo -e "  ${RED}•${NC} $E"; done
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}  Warnings (${#WARNINGS[@]}):${NC}"
    for W in "${WARNINGS[@]}"; do echo -e "  ${YELLOW}•${NC} $W"; done
  fi
  echo ""
  exit 1
fi

echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
