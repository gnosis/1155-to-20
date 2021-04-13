try {
  require('dotenv').config();
  console.log('imported env variables from .env using dotenv');
} catch(e) {
  console.log('did not find dotenv');
}

const seedPhrase = process.env.SEED_PHRASE ||
  (
    console.log('SEED_PHRASE not set'),
    'myth like bonus scare over problem client lizard pioneer submit female collect'
  );
const privateKeys = [process.env.PRIVATE_KEY] ||
  (
    console.log('privateKey not set')
  );
const infuraProjectId = process.env.INFURA_PROJECT_ID ||
  (console.log('INFURA_PROJECT_ID not set'), '');
const etherscanApiKey = process.env.ETHERSCAN_API_KEY ||
  (console.log('ETHERSCAN_API_KEY not set'), '');

let gasPrice;
if (process.env.GAS_PRICE != null) {
  console.log('setting gas price to', process.env.GAS_PRICE, 'gwei');
  gasPrice = process.env.GAS_PRICE * 1e9;
}

const networksInfo = [
  { name: 'mainnet', id: '1', url: `wss://mainnet.infura.io/ws/v3/${infuraProjectId}` },
  { name: 'ropsten', id: '3', url: `wss://ropsten.infura.io/ws/v3/${infuraProjectId}` },
  { name: 'kovan', id: '42', url: `wss://kovan.infura.io/ws/v3/${infuraProjectId}` },
  { name: 'rinkeby', id: '4', url: `wss://rinkeby.infura.io/ws/v3/${infuraProjectId}` },
  { name: 'goerli', id: '5', url: `wss://goerli.infura.io/ws/v3/${infuraProjectId}` },
  { name: 'xdai', id: '100', url: 'wss://rpc.xdaichain.com/wss' },
];

let HDWalletProvider;
try {
  HDWalletProvider = require('@truffle/hdwallet-provider');
  console.log('found HDWalletProvider');
} catch (e) {
  console.log('not using HDWalletProvider');
}

const networks = {};
for (const { name, id, url } of networksInfo) {
  let walletProvider = null;
  if (HDWalletProvider && !privateKeys) {
    walletProvider = new HDWalletProvider({
        mnemonic: { phrase: seedPhrase },
        providerOrUrl: url,
      })
  } else if(HDWalletProvider && privateKeys) {
    walletProvider = new HDWalletProvider(privateKeys, url, 0, 1)
  }
    if (seedPhrase) {
    networks[name] = {
      provider: () => walletProvider,
      network_id: id,
    };
  } else {
    networks[name] = {
      host: "localhost",
      port: 8545,
      network_id: id,
    };
  }

  if (gasPrice) {
    networks[name].gasPrice = gasPrice;
  }
}

networks.local = {
  host: "localhost",
  port: 8545,
  network_id: "*"
};
if (gasPrice) {
  networks.local.gasPrice = gasPrice;
}

module.exports = {
  networks,
  compilers: {
    solc: {
      version: "0.6.12",
    },
  },
  plugins: [
    "truffle-plugin-verify",
    "truffle-plugin-networks",
  ],
  api_keys: {
    etherscan: etherscanApiKey,
  },
}
