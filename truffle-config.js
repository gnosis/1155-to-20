module.exports = {
  networks: {
    mainnet: {
      host: "localhost",
      port: 8545,
      network_id: "1"
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: "3"
    },
    kovan: {
      host: "localhost",
      port: 8545,
      network_id: "42"
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: "4"
    },
    xdai: {
      host: "localhost",
      port: 8545,
      network_id: "100"
    },
    local: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.6.12",
    }
  }
}
