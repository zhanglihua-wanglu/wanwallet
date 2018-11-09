"use strict";

const settings=require('../settings.js');
const Logger = require('./logger.js');
const mkdirsSync = require('mkdirs-sync');

let config;
if(settings.network === 'testnet'){
    config = require('./config_testnet.js');
}else {
    config = require('./config_main.js');
}
config.version = '1.0.0';
config.host = '// http://localhost'; // http://localhost
config.rpcIpcPath = settings.rpcIpcPath;


config.keyStorePath = settings.getKeystoreDir('wanchain');
config.ethkeyStorePath = settings.getKeystoreDir('ethereum');


config.useLocalNode = true;

config.loglevel = settings.loglevel;

config.listOption = true;

mkdirsSync(config.databasePath);
config.logger = new Logger('CrossChainBtc',config.ccLog, config.ccErr,config.loglevel);
let loggers = [];
config.getLogger = function (name) {
    if (loggers[name]) {
        return loggers[name];
    } else {
        loggers[name] = new Logger(name, config.ccLog, config.ccErr, config.loglevel);
        return loggers[name];
    }
}
config.wanKeyStorePath = config.keyStorePath;
config.ethKeyStorePath = config.ethkeyStorePath;

config.MAX_CONFIRM_BLKS = 100000000;
config.MIN_CONFIRM_BLKS = 0;
config.listOption = true;
config.gasLimit = 1000000;
config.gasPrice = 200000000000;
//config.feeRate = 300;

// config.ethGasPrice = 60;
// config.wanGasPrice = 200;
// config.ethNormalGas = 21000;
// config.ethLockGas = 300000; //171866;
// config.ethRefundGas = 120000;  // 91663;
// config.ethRevokeGas = 100000; // 40323;

// config.wanLockGas = 300000; // 232665;
// config.wanRefundGas = 120000; // 34881;
// config.wanRevokeGas = 100000; // 49917;

// config.depositOriginLockEvent = 'ETH2WETHLock(address,address,bytes32,uint256,address)';
// config.depositCrossLockEvent = 'ETH2WETHLock(address,address,bytes32,uint256)';

// config.withdrawOriginLockEvent = 'WETH2ETHLock(address,address,bytes32,uint256,address,uint256)';
// config.withdrawCrossLockEvent = 'WETH2ETHLock(address,address,bytes32,uint256)';


// config.depositOriginRefundEvent = 'ETH2WETHRefund(address,address,bytes32,bytes32)';
// config.withdrawOriginRefundEvent = 'WETH2ETHRefund(address,address,bytes32,bytes32)';

// config.depositOriginRevokeEvent = 'ETH2WETHRevoke(address,bytes32)';
// config.withdrawOriginRevokeEvent = 'WETH2ETHRevoke(address,bytes32)';


config.crossDbname = 'crossTransDbBtc';
config.crossCollection = 'btcCrossTransaction';
config.btcWallet = 'btcWallet.db';

config.consoleColor = {
	'COLOR_FgRed': '\x1b[31m',
	'COLOR_FgYellow': '\x1b[33m',
	'COLOR_FgGreen': "\x1b[32m"
};

module.exports = config;
