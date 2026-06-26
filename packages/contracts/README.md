# Soroban Project

## Project Structure

This repository uses the recommended structure for a Soroban project:

```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- New Soroban contracts can be put in `contracts`, each in their own directory. There is already a `hello_world` contract in there to get you started.
- If you initialized this project with any other example contracts via `--with-example`, those contracts will be in the `contracts` directory as well.
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.
- Frontend libraries can be added to the top-level directory as well. If you initialized this project with a frontend template via `--frontend-template` you will have those files already included.

## Optimization and WASM Size Limits

Soroban has a 256KB strict limit on compiled WASM sizes. To ensure contracts remain under this limit, use the provided optimization script.

To build and optimize all contracts, run:
```bash
make build-optimized
```

This command will:
1. Compile the contracts using `cargo build --release --target wasm32-unknown-unknown`
2. Optimize the WASM binary using `stellar contract optimize`
3. Report the size of each optimized contract
4. Fail with a non-zero exit code if any optimized contract exceeds 256KB
