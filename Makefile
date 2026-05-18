# Path configuration to include cargo and wasm-pack binaries
export PATH := $(HOME)/.cargo/bin:$(PATH)

.PHONY: all build check test clean

all: build

# Build the WebAssembly package for the web
build:
	wasm-pack build --target web

# Check the compilation of the Rust library
check:
	cargo check

# Run unit/integration tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean
	rm -rf pkg
