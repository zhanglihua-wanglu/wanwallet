"use strict";

const config = {};
const path = require('path');
const settings=require('../settings.js');

config.network = "main";
global.wanchain_js_testnet =  false;
config.socketUrl = 'wss://api.wanchain.info';

// log path
config.logPathPrex = path.join(settings.userDataPath,'log',config.network);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

// db path
config.databasePathPrex = path.join(settings.userDataPath, 'Db',`${config.network}DB`);


config.wethToken = {
    address: "0x28362cd634646620ef2290058744f9244bb90ed9",
    name: 'Wanchain Ethereum Crosschain Token',
    symbol: 'WETH',
    decimals: 18
};

config.ethHtlcAddr          = "0x78eb00ec1c005fec86a074060cc1bc7513b1ee88";
config.wanHtlcAddr          = "0x7a333ba427fce2e0c6dd6a2d727e5be6beb13ac2";

config.ethTokenAddressOnWan   = config.wethToken.address;

config.confirmBlocks            = 12;
config.tryTimes                 = 3;

module.exports = config;
