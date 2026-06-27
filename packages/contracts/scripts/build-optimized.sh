#!/usr/bin/env bash
set -e

# Build the contracts
echo "Building contracts in release mode..."
cargo build --release --target wasm32-unknown-unknown

# Optimize and check size
mkdir -p target/optimized
MAX_SIZE=$((256 * 1024))

echo "Optimizing and checking WASM sizes..."
for wasm in target/wasm32-unknown-unknown/release/*.wasm; do
    filename=$(basename "$wasm")
    echo "Optimizing $filename..."
    stellar contract optimize --wasm "$wasm"
    
    optimized_file="target/wasm32-unknown-unknown/release/${filename%.wasm}.optimized.wasm"
    
    size=$(stat -c%s "$optimized_file" 2>/dev/null || stat -f%z "$optimized_file")
    
    echo "$filename optimized size: $size bytes"
    
    if [ "$size" -gt "$MAX_SIZE" ]; then
        echo "ERROR: $filename exceeds maximum size of 256KB ($size bytes > $MAX_SIZE bytes)"
        exit 1
    fi
done

echo "All contracts are within the 256KB size limit."
