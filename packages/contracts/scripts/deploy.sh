#!/usr/bin/env bash
set -euo pipefail

NETWORK=${1:---network testnet}
ENV_FILE="$(dirname "$0")/../.env.contracts"

echo "Deploying contracts on ${NETWORK}..."

CALL_REGISTRY_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/call_registry.wasm $NETWORK)
RESULT_ORACLE_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/result_oracle.wasm $NETWORK)

stellar contract invoke --id "$CALL_REGISTRY_ID" $NETWORK -- initialize --oracle_id "$RESULT_ORACLE_ID"
stellar contract invoke --id "$RESULT_ORACLE_ID" $NETWORK -- initialize --registry_id "$CALL_REGISTRY_ID"

printf 'CALL_REGISTRY_ID=%s\nRESULT_ORACLE_ID=%s\n' "$CALL_REGISTRY_ID" "$RESULT_ORACLE_ID" > "$ENV_FILE"
echo "Deployed. IDs saved to $ENV_FILE"
