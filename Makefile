# Path configuration to include cargo and wasm-pack binaries
export PATH := $(HOME)/.cargo/bin:$(PATH)

.PHONY: all build check test clean fmt clippy

all: build

# Build the WebAssembly package for the web
build:
	wasm-pack build --target web

# Check the compilation of the Rust library
check:
	cargo check

# Run code formatter check
fmt:
	cargo fmt --all -- --check

# Run linter checks
clippy:
	cargo clippy --all-targets --all-features -- -D warnings

# Run unit/integration tests
test:
	cargo test --verbose --all-features

# Clean build artifacts
clean:
	cargo clean
	rm -rf pkg
