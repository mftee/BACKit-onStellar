#!/usr/bin/env bash
# setup.sh — deploy contracts to a specific network and output .env.contracts.<network>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK="${1:-testnet}"
CONFIG="$SCRIPT_DIR/networks/${NETWORK}.toml"

if [[ ! -f "$CONFIG" ]]; then
  echo "ERROR: Unknown network '$NETWORK'. Config not found at $CONFIG" >&2
  echo "Available networks: testnet mainnet futurenet" >&2
  exit 1
fi

# Parse TOML values (minimal grep-based parser for CI portability)
RPC_URL=$(grep 'rpc_url' "$CONFIG" | sed 's/.*= *"//' | sed 's/"//')
PASSPHRASE=$(grep 'network_passphrase' "$CONFIG" | sed 's/.*= *"//' | sed 's/"//')
STELLAR_ARGS="--rpc-url $RPC_URL --network-passphrase \"$PASSPHRASE\""

echo "==> Deploying to $NETWORK (RPC: $RPC_URL)"

# Build
(cd "$SCRIPT_DIR/.." && cargo build --target wasm32-unknown-unknown --release 2>&1)

# Deploy call_registry
CALL_REGISTRY_ID=$(stellar contract deploy \
  --wasm "$SCRIPT_DIR/../target/wasm32-unknown-unknown/release/call_registry.wasm" \
  --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" \
  --source "$STELLAR_SOURCE_ACCOUNT" 2>&1 | tail -1)

# Deploy outcome_manager
OUTCOME_MANAGER_ID=$(stellar contract deploy \
  --wasm "$SCRIPT_DIR/../target/wasm32-unknown-unknown/release/outcome_manager.wasm" \
  --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" \
  --source "$STELLAR_SOURCE_ACCOUNT" 2>&1 | tail -1)

echo "==> Contract IDs:"
echo "    call_registry:    $CALL_REGISTRY_ID"
echo "    outcome_manager:  $OUTCOME_MANAGER_ID"

# Output env file for backend consumption
ENV_OUT="$SCRIPT_DIR/../.env.contracts.${NETWORK}"
cat > "$ENV_OUT" <<EOF
NETWORK=${NETWORK}
NETWORK_PASSPHRASE=${PASSPHRASE}
SOROBAN_RPC_URL=${RPC_URL}
CALL_REGISTRY_CONTRACT_ID=${CALL_REGISTRY_ID}
OUTCOME_MANAGER_CONTRACT_ID=${OUTCOME_MANAGER_ID}
EOF

echo "==> Saved contract IDs to $ENV_OUT"
