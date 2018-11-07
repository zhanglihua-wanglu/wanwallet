"use strict";

const config = {};
const path = require('path');
const settings=require('../settings.js');

config.network = "testnet";
global.wanchain_js_testnet =  true;
config.socketUrl = 'wss://apitest.wanchain.info';

// log path
config.logPathPrex = path.join(settings.userDataPath,'log',config.network);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

// db path
config.databasePathPrex = path.join(settings.userDataPath, 'Db',`${config.network}DB`);


config.wethToken = {
    address: "0x46397994a7e1e926ea0de95557a4806d38f10b0d",
    name: 'Wanchain Ethereum Crosschain Token',
    symbol: 'WETH',
    decimals: 18
};

// config.ethHtlcAddr          = "0x358b18d9dfa4cce042f2926d014643d4b3742b31";
// config.wanHtlcAddr          = "0xfbaffb655906424d501144eefe35e28753dea037";

config.ethTokenAddressOnWan   = config.wethToken.address;

config.confirmBlocks            = 2;
config.tryTimes                 = 3;

module.exports = config;
