# js-cosmos-lib

#### Создание экземпляра клиента

```
import Cosmos from 'js-cosmos-lib';
import { Base64 } from 'js-base64';

const cosmosClient = Cosmos({
  BLOCKCHAIN_URL: {BLOCKCHAIN_URL},
});
```

#### Регистрации пользователя

```
const session = cosmosClient.Session.random();
const mnemonic = session.mnemonic;
const public_key = session.keyPair.publicKey.toString('base64');
const privateKey = session.keyPair.privateKey.toString('hex');
const address = cosmosClient.crypto.mnemonicToAddress(mnemonic, 0);
const w_holder = cosmosClient.crypto.mnemonicToAddress(mnemonic, 1);
const w_ref_reward = cosmosClient.crypto.mnemonicToAddress(mnemonic, 2);

fetch('/blockchain/register', {
  address,
  w_holder,
  w_ref_reward,
  public_key,
  w_holder_name: WALLET_NAME,
}, {
  headers: { Authorization: TOKEN },
});
```

#### Получить данные из мнемоники

```
const keyPair = cosmosClient.crypto.mnemonicToKeyPair(mnemonic);

const publicKey = keyPair.publicKey.toString('base64');
const privateKey = keyPair.privateKey.toString('hex');
```

#### Создание кошелька

```
const walletAddress = cosmosClient.crypto.mnemonicToAddress(
  mnemonic,
  walletLength + 1
);

const messages = [
  {
    type: 'wallets/Create',
    value: {
      wallet: {
        address: walletAddress,
        accountAddress,
        type: 'HOLDER',
        extra: Base64.encode(JSON.stringify({ walletName: name })),
      },
      authorAddress: accountAddress,
    },
  }
];

const signature = await cosmosClient.crypto.sign(
  accountAddress,
  keyPair,
  messages
);

fetch('/txs', signature);
```

#### Переименование кошелька

```   
const messages = [{
  type: 'wallets/SetExtra',
  value: {
    walletAddress,
    authorAddress: accountAddress,
    extra:  Base64.encode(JSON.stringify({ walletName: name })),
  },
}];


const signature = await cosmosClient.crypto.sign(
  accountAddress,
  keyPair,
  messages
);

fetch('/txs', signature);
```
 
#### Отправка VipCoinGold на свой кошелек

```
const messages = [{
  type: 'core/SystemTransfer',
  value: {
    systemTransfer: {
      fromWallet,
      toWallet,
      asset: 'vc',
      amount: AMOUNT * 100000000,
      timestamp: Math.floor(Date.now() / 1000),
    },
    authorAddress: accountAddress,
  },
}];


const signature = await cosmosClient.crypto.sign(
  accountAddress,
  keyPair,
  messages
);

fetch('/txs', signature);
```

#### Отправка VipCoinGold на чужой кошелек 

```
const messages = [{
  type: 'core/Payment',
  value: {
    payment: {
      walletFrom,
      walletTo,
      assetName: 'vc',
      amount: AMOUNT * 100000000,
      timestamp: Math.floor(Date.now() / 1000),
    },
    authorAddress,
  },
}];


const signature = await cosmosClient.crypto.sign(
  accountAddress,
  keyPair,
  messages
);

fetch('/txs', signature);
```