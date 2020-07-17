const fetch = require('node-fetch');
const KeyStore = require('./KeyStore');
const util = require('util');

function getSessionClass(constants, crypto) {
  const { BLOCKCHAIN_URL } = constants;

  const {
    generateMnemonic,
    entropyToMnemonic,
    mnemonicToEntropy,

    mnemonicToAddress,
    mnemonicToKeyPair,

    sign,
  } = crypto;

  class Session {
    constructor({
      mnemonic,
      secretKey,
      log = false,
      name,
    }) {
      if (!mnemonic) {
        mnemonic = entropyToMnemonic(secretKey);
      }

      const address = mnemonicToAddress(mnemonic, 0);
      const keyPair = mnemonicToKeyPair(mnemonic, 0);

      Object.assign(this, {
        mnemonic,
        address,
        keyPair,

        log,
        name,
      });
    }

    getAddressForIndex(index) {
      return mnemonicToAddress(this.mnemonic, index);
    }

    getKeyPairForIndex(index) {
      return mnemonicToKeyPair(this.mnemonic, index);
    }

    // mode can be async/sync/block
    // block is the default
    //  async - Send and don't wait for any kind of handling.
    //  sync  - Send and run through business logic validation.
    //  block - Send, run through business logic and wait for
    //          actual block to be written.
    async send(type, value, mode = 'block') {
      const { address, keyPair } = this;

      value.authorAddress = this.address;

      const tx = await this
        .getSignedBroadcastableTransaction([{ type, value }], mode);

      return this.broadcast(tx, type);
    }

    async getSignedBroadcastableTransaction(messages, mode = 'block') {
      const { address, keyPair } = this;
      return await sign(address, keyPair, messages, mode);
    }

    async sendMulti(typeValuePairs, mode = 'block') {
      const { address, keyPair } = this;

      for (const { value } of Object.values(typeValuePairs)) {
        value.authorAddress = this.address;
      }

      const tx = await this
        .getSignedBroadcastableTransaction(typeValuePairs, mode);

      const type = typeValuePairs.map(item => item.type).join(', ');
      return this.broadcast(tx, type);
    }

    async broadcast(tx, type) {
      const response = await fetch(`${BLOCKCHAIN_URL}/txs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tx),
      });

      const json = await response.json();
      const { log, name } = this;
      if (log) {
        const utilInspectParams = {
          colors: true,
          depth: null,
        };

        const prefix = name ? `${name}/${type}` : `${type}`
        const [ msg ] = tx.tx.msg;

        console.log(prefix);
        console.log(`msg: ${util.inspect(msg, utilInspectParams)}`);
        console.log(`response: ${util.inspect(json, utilInspectParams)}`);
        console.log('');
      }

      return json;
    }

    static random(params = {}) {
      const mnemonic = generateMnemonic();

      return new Session({
        ...params,
        mnemonic,
      });
    }

    toKeyStoreData(password, stringify = true) {
      if (!password) {
        throw new Error('Missing password');
      }

      const secretKey = mnemonicToEntropy(this.mnemonic);
      let data = KeyStore.generateKeyStoreFile(password, secretKey);
      if (stringify) {
        data = JSON.stringify(data, null, 2);
      }

      return data;
    }

    static fromKeyStoreData(password, data, sessionAdditionalParams = {}) {
      if (!password) {
        throw new Error('Missing password');
      }

      if (!data) {
        throw new Error('Missing data');
      }

      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      const { sk } = KeyStore.recoverKeys(password, data);

      return new Session({
        secretKey: sk,
        ...sessionAdditionalParams,
      });
    }

    /*
      KeyStore usage example.

      {
        const s = Session.random();
        fs.writeFileSync('./t.keystore', s.toKeyStoreData('password'));
      }

      {
        const d = fs.readFileSync('./t.keystore').toString('utf8');
        const s = Session.fromKeyStoreData('password', d);
      }
    */
  }

  return Session;
}

module.exports = getSessionClass;
