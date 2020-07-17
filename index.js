const getCrypto = require('./src/cosmosCrypto');
const getSessionClass = require('./src/cosmosSession');

const defaults = {
  BLOCKCHAIN_URL: 'http://localhost:1317',
  CHAIN_ID: 'vc-core-chain',
  BASE_BIP44_PATH: `m/44'/118'/0'/0`,
  BECH32_PREFIX: 'cosmos',
};

function getCosmosClient(params) {
  const constants = {
    ...defaults,
    ...params,
  };

  const crypto = getCrypto(constants);
  const Session = getSessionClass(constants, crypto);

  return { crypto, Session };
}

module.exports = getCosmosClient;
