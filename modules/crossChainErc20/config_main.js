"use strict";

const config = {};
const path = require('path');
const settings = require('../settings.js');

config.network = "main";
config.socketUrl = 'wss://apitest.wanchain.info';
// config.socketUrl = 'wss://api.wanchain.info';

// log path
config.logPathPrex = path.join(settings.userDataPath,'log',config.network);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

// db path
config.databasePathPrex = path.join(settings.userDataPath, 'Db',`${config.network}DB`);

// for E20 new contract
config.ethHtlcAddrE20      = "0x87a0dee965e7679d15327ce0cc3df8dfc009b43d";
config.wanHtlcAddrE20      = "0xe10515355e684e515c9c632c9eed04cca425cda1";


config.confirmBlocks            = 12;
config.tryTimes                 = 3;

module.exports = config;
