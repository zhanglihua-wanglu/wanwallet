"use strict";

const config = {};
const path = require('path');
const settings = require('../settings.js');

config.network = "main";
global.wanchain_js_sdk_testnet =  false;
config.socketUrl = 'wss://api.wanchain.info';

// log path
config.logPathPrex = path.join(settings.userDataPath,'log',config.network);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

// db path
config.databasePathPrex = path.join(settings.userDataPath, 'Db',`${config.network}DB`);

// for E20 new contract
config.ethHtlcAddrE20      = "0xd7c04860990529f4fed93bd6d2367dc57768b513";
config.wanHtlcAddrE20      = "0x5f86e48f5eeb1f925b4562ddb4e671baa5831359";


config.confirmBlocks            = 12;
config.tryTimes                 = 3;

module.exports = config;
