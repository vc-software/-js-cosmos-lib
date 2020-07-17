const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const bip32 = require('bip32');
const bech32 = require('bech32');

const fetch = require('node-fetch');
const determenisticJSONStringify = require('json-stable-stringify-without-jsonify');

function getCrypto(constants) {
  const {
    BLOCKCHAIN_URL,
    CHAIN_ID,
    BASE_BIP44_PATH,
    BECH32_PREFIX,
  } = constants;

  function getPathForIndex(index = 0) {
    return `${BASE_BIP44_PATH}/${index}`;
  }

  function generateMnemonic() {
    return bip39.generateMnemonic(256);
  }

  function entropyToMnemonic(secretKey) {
    return bip39.entropyToMnemonic(secretKey);
  }

  function mnemonicToEntropy(mnemonic) {
    return bip39.mnemonicToEntropy(mnemonic);
  }

  function mnemonicToAddress(mnemonic, index) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("invalid mnemonic");
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const node = bip32.fromSeed(seed);

    // To generate extended private/public keys
    // const xprv = node.toBase58();
    // const xpub = node.neutered().toBase58();

    const child = node.derivePath(getPathForIndex(index));
    const words = bech32.toWords(child.identifier);

    const address = bech32.encode(BECH32_PREFIX, words);
    return address;
  }

  function mnemonicToKeyPair(mnemonic, index) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const node = bip32.fromSeed(seed);
    const child = node.derivePath(getPathForIndex(index));
    const keyPair = bitcoin.ECPair
      .fromPrivateKey(child.privateKey);

    return keyPair;
  }

  function convertAllNumericValuesToString(object) {
    for (const [key, value] of Object.entries(object)) {
      if (typeof value === 'number') {
        object[key] = String(value);
      } else if (value) {
        if (Array.isArray(value)) {
          value.forEach(convertAllNumericValuesToString);
        }
        else if (value.constructor === Object) {
          convertAllNumericValuesToString(value);
        }
      }
    }
  }

  async function sign(address, keyPair, msgs, mode = 'block') {
    const response = await fetch(`${BLOCKCHAIN_URL}/auth/accounts/${address}`);

    const data = await response.json();
    let { account_number, sequence } = data.result.value;
    account_number = String(account_number);
    sequence = String(sequence);

    // console.log(address, account_number, sequence);

    const transaction = {
      msgs,
      chain_id: CHAIN_ID,
      fee: {
        amount: [
          // {
          //     amount: String(50), denom: "nametoken",
          // },
        ],
        gas: 200000000,
      },
      memo: '',
      account_number,
      sequence,
    };

    convertAllNumericValuesToString(transaction);

    const transactionHashBuffer = crypto.createHash('sha256')
      .update(determenisticJSONStringify(transaction))
      .digest();

    const signature = keyPair.sign(transactionHashBuffer).toString('base64');

    const broadcastableTransaction = {
      tx: {
        msg: transaction.msgs,
        fee: transaction.fee,
        signatures: [
          {
            account_number,
            sequence,
            signature,

            pub_key: {
              type: "tendermint/PubKeySecp256k1",
              value: keyPair.publicKey.toString('base64'),
            },
          },
        ],
        memo: transaction.memo,
      },
      mode,
    };

    return broadcastableTransaction;
  }

  return {
    generateMnemonic,
    mnemonicToAddress,
    mnemonicToKeyPair,

    entropyToMnemonic,
    mnemonicToEntropy,

    sign,
  };
}

module.exports = getCrypto;
