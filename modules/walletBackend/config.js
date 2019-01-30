const path = require('path')
const fs = require('fs')
const bitcoin = require('bitcoinjs-lib')
const settings = require('../settings.js')
const Logger = require('./logger.js');

let config = {}
config.network = settings.network

if (settings.network.includes('main')) {
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

    config.feeRate = 30
    config.feeHard = 10000
    config.confirmBlocks = 12
    config.btcConfirmBlocks = 3
    config.defaultAmount = 0.0002;
} else {
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

    config.feeRate = 300
    config.feeHard = 100000
    config.confirmBlocks = 3
    config.btcConfirmBlocks = 1
    config.defaultAmount = 0.002;
}

config.tryTimes = 3
config.ethTokenAddressOnWan = config.wethToken.address;
config.WBTCToken = config.wbtcToken.address;

config.logPathPrex = path.join(settings.userDataPath, 'log', config.network);
config.databasePathPrex = path.join(settings.userDataPath, 'Db', `${config.network}DB`);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

config.loglevel = settings.loglevel
config.rpcIpcPath = settings.rpcIpcPath
config.keyStorePath = settings.getKeystoreDir('wanchain')
config.ethkeyStorePath = settings.getKeystoreDir('ethereum')

config.useLocalNode = true 
config.listOption = true   

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

config.ethGasPrice = 60e9
config.wanGasPrice = 200e9
config.ethNormalGas = 100000
config.ethLockGas = 300000
config.ethRefundGas = 200000 
config.ethRevokeGas = 200000 

config.wanLockGas = 1e6
config.wanRefundGas = 1e6 
config.wanRevokeGas = 1e6 

config.MAX_CONFIRM_BLKS = 100000000;
config.MIN_CONFIRM_BLKS = 0;

// database config
config.crossDbname = 'wanchainDb'
config.crossCollection = 'crossTrans'             // E20 & ETH
config.crossCollectionBtc = 'crossTransBtc';      // BTC crosschain + normal
config.normalCollection = 'normalTrans'           // E20 & ETH normal
config.btcWalletCollection = 'data'               // BTC wallet balance

config.consoleColor = {
    'COLOR_FgRed': '\x1b[31m',
    'COLOR_FgYellow': '\x1b[33m',
    'COLOR_FgGreen': "\x1b[32m"
}

module.exports = config