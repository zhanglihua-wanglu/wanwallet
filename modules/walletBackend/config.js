const path = require('path')
const fs = require('fs')
const bitcoin = require('bitcoinjs-lib')
const settings = require('../settings.js')
const Logger = require('./logger.js');

let config = {}
config.network = settings.network

if (config.network === 'testnet') {
    global.wanchain_js_testnet =  true
    config.bitcoinNetwork = bitcoin.networks.testnet
    config.socketUrl = 'wss://apitest.wanchain.info'
    config.wethToken = {
        address: "0x46397994a7e1e926ea0de95557a4806d38f10b0d",
        name: 'Wanchain Ethereum Crosschain Token',
        symbol: 'WETH',
        decimals: 18
    }

    config.wbtcToken = {
        address: "0x89a3e1494bc3db81dadc893ded7476d33d47dcbd",
        name: 'Wanchain Btc Crosschain Token',
        symbol: 'WBTC',
        decimals: 8
    }

    config.confirmBlocks = {
        'btc' : 1,
        'eth' : 2,
        'wan' : 3
    }

    config.htlcs = {
        'btc': '0xb248ed04e1f1bbb661b56f210e4b0399b2899d16'
    }
} else {
    global.wanchain_js_testnet =  false
    config.bitcoinNetwork = bitcoin.networks.bitcoin
    config.socketUrl = 'wss://api.wanchain.info'
    config.wethToken = {
        address: "0x28362cd634646620ef2290058744f9244bb90ed9",
        name: 'Wanchain Ethereum Crosschain Token',
        symbol: 'WETH',
        decimals: 18
    }

    config.wbtcToken = {
        address: "0xd15e200060fc17ef90546ad93c1c61bfefdc89c7",
        name: 'Wanchain Btc Crosschain Token',
        symbol: 'WBTC',
        decimals: 8
    }

    config.htlcs = {
        'btc': '0x50c53a4f6702c2713b3535fc896bc21597534906'
    }

    
    config.confirmBlocks = {
        'btc' : 3,
        'eth' : 12,
        'wan' : 12
    }
}

config.fee = {
    'btc' : {
        'rate'  : 300,
        'fixed' : 100000 
    }
}

config.tryTimes                 = 3
config.ethTokenAddressOnWan   = config.wethToken.address;
config.WBTCToken = config.wbtcToken.address;
config.logPath = path.join(settings.userDataPath, 'LOG', settings.network)
// config.dbPath = path.join(settings.userDataPath, 'DB', settings.network)

// _mkdirsSync(settings.userDataPath)

config.ccLog = path.join(config.logPath, 'crossChainLog.log')
config.ccErr = path.join(config.logPath, 'crossChainErr.log')
config.mrLog = path.join(config.logPath, 'ccMonitorLog.log')
config.mrErr = path.join(config.logPath, 'ccMonitorErr.log')

config.loglevel = settings.loglevel
config.rpcIpcPath = settings.rpcIpcPath
config.keyStorePath = settings.getKeystoreDir('wanchain')
config.ethkeyStorePath = settings.getKeystoreDir('ethereum')

config.useLocalNode = true // ???
config.listOption = true   // ???

config.loggers = {}
config.getLogger = function (name) {
    if (!config.loggers[name]) {
        config.loggers[name] = new Logger(name, config.ccLog, config.ccErr, config.loglevel);
    }
    return config.loggers[name]
}

config.wanKeyStorePath = config.keyStorePath
config.ethKeyStorePath = config.ethkeyStorePath
config.btcKeyStorePath = ''

config.ethGasPrice = 60
config.wanGasPrice = 200
config.ethNormalGas = 30000//21004
config.ethLockGas = 200000 //171866;
config.ethRefundGas = 120000  // 91663;
config.ethRevokeGas = 100000 // 40323;

config.wanLockGas = 300000 // 232665;
config.wanRefundGas = 120000 // 34881;
config.wanRevokeGas = 100000 // 49917;

config.MAX_CONFIRM_BLKS = 100000000;
config.MIN_CONFIRM_BLKS = 0;

// database config
// config.crossDbname = 'wanchainDb'
// config.crossCollection = 'crossTrans'             // E20 & ETH
// config.crossCollectionBtc = 'crossTransBtc';      // BTC crosschain + normal
// config.normalCollection = 'normalTrans'           // E20 & ETH normal
// config.btcWalletCollection = 'data'               // BTC wallet balance

config.consoleColor = {
    'COLOR_FgRed': '\x1b[31m',
    'COLOR_FgYellow': '\x1b[33m',
    'COLOR_FgGreen': "\x1b[32m"
}

// function _mkdirsSync(dirname) {
//     if (fs.existsSync(dirname)) {
//         return true
//     } else {
//         if (mkdirsSync(path.dirname(dirname))) {
//             fs.mkdirSync(dirname)
//             return true
//         }
//     }
// }

module.exports = config