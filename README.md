# Bitcoin Bare P2MS Demo

This is a demo to create and spend a bare P2MS (Pay-to-Multi-Signature) transaction, made with [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib).

## Usage

1. Install the nodejs dependencies

    ```bash
    yarn
    ```

2. Start a Bitcoin Core client in regtest mode (better from an empty blockchain):

    ```conf
    # ~/.bitcoin/bitcoin.conf
    regtest=1
    server=1
    rpcallowip=0.0.0.0/0
    rpcuser=user
    rpcpassword=pass
    ```

3. Run the demo

    ```bash
    node index.js
    ```
