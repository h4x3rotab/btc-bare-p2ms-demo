const bitcoin = require('bitcoinjs-lib');
const Client = require('bitcoin-core');

const regtest = bitcoin.networks.regtest;

const skWIF = [
    'cN23v6xjPT2JCq8URUBifr9KdAgJNJDkDr6L7VRBFTxnLxNffpKH',
    'cTxhdvPxFpDRS4fwGsdLbXFdFPy1fLXMBfxEgMzCpBsqUkDQZJnL'
];
const addr = [
    'mui8FniG6uhwAn4ERN4UGCvvXGbniub1a7',
    'myRZ7jQFbvSNN7Z6UJxRJ5jpshQHBsnUAn'
];

async function main() {
    const sk = skWIF.map(k => bitcoin.ECPair.fromWIF(k, regtest));
    const pk = sk.map(k => k.publicKey);

    const rpc = new Client({network: 'regtest', username: 'user', password: 'pass', port: 18443});

    // ---- Prepration ----

    // import privkeys to the node so that we can lookup the transactions from bitcoin client easier
    await rpc.importPrivKey(skWIF[0]);
    await rpc.importPrivKey(skWIF[1]);

    // mine 101 blocks to get some coins in addr[0]
    const hashes = await rpc.generateToAddress(101, addr[0]);

    // find the first utxo
    const block1 = await rpc.getBlock(hashes[0]);
    const txHash0 = block1.tx[0];
    const tx0 = await rpc.getTransaction(txHash0, false, true);  // verbose: get decoded tx
    const txBody = tx0.decoded;
    const utxo = txBody.vout[0];
    console.log({tx0, utxo});

    // create a bare P2MS wallet
    const p2ms = bitcoin.payments.p2ms({m: 2, pubkeys: pk}, {});
    const outputScript = p2ms.output;

    // fund the bare P2MS wallet by the mined coins
    const psbt = new bitcoin.Psbt({network: regtest});
    psbt.addInput({
        hash: txHash0,
        index: utxo.n,
        nonWitnessUtxo: Buffer.from(tx0.hex, 'hex')
    });
    psbt.addOutput({
        script: outputScript,
        value: ((utxo.value * 1e8 | 1) - 1000)  // in sat
    });
    psbt.signInput(0, sk[0]);
    psbt.validateSignaturesOfInput(0);
    psbt.finalizeAllInputs();
    const fundingTxHex = psbt.extractTransaction().toHex();

    // broadcast the funding tx
    const fundingTxHash = await rpc.sendRawTransaction(fundingTxHex);
    console.log(fundingTxHash);

    // mine one block. confirm the tx.
    await rpc.generateToAddress(1, addr[0]);

    // ---- P2MS spending demo ----
    
    // spend the P2MS
    const p2msUnspentTx = await rpc.getTransaction(fundingTxHash, false, true);  // verbose: get decoded tx
    const p2msUtxo = p2msUnspentTx.decoded.vout[0];
    const p2msPsbt = new bitcoin.Psbt({network: regtest});
    p2msPsbt.addInput({
        hash: fundingTxHash,
        index: p2msUtxo.n,
        nonWitnessUtxo: Buffer.from(p2msUnspentTx.hex, 'hex')
    })
    p2msPsbt.addOutput({
        address: addr[1],
        value: ((utxo.value * 1e8 | 1) - 2000)  // in sat
    });
    // sign the spending tx
    p2msPsbt.signInput(0, sk[0]);   // sign with key 0
    p2msPsbt.signInput(0, sk[1]);   // sign with key 1
    const p2msSigned = p2msPsbt.validateSignaturesOfInput(0);
    console.log({p2msSigned});
    // extract tx
    p2msPsbt.finalizeAllInputs();
    const p2msSpendingTx = p2msPsbt.extractTransaction().toHex();

    const spendingTxHash = await rpc.sendRawTransaction(p2msSpendingTx);
    console.log(spendingTxHash);
}

try { main(); } catch(e) { console.error(e); process.exit(-1) };