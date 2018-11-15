"use strict";

const bitcoin = require('bitcoinjs-lib');
const config = {};
const path = require('path');
const settings = require('../settings.js');
config.ccLog = path.join(settings.userDataPath, 'testnet', 'crossChainBtcLog.log');
config.ccErr = path.join(settings.userDataPath, 'testnet', 'crossChainBtcErr.log');
config.socketUrl = 'wss://apitest.wanchain.info';
config.databasePath = settings.userDataPath;
config.databasePath=path.join(config.databasePath, 'testnetDb');

config.wanchainHtlcAddr = "0xb248ed04e1f1bbb661b56f210e4b0399b2899d16";

config.confirmBlocks = 3;
config.btcConfirmBlocks = 1;
config.feeRate = 300;
config.feeHard = 100000;
config.bitcoinNetwork = bitcoin.networks.testnet;
config.network = 'testnet';


config.wbtcToken = {
    address: "0x89a3e1494bc3db81dadc893ded7476d33d47dcbd",
    name: 'Wanchain Btc Crosschain Token',
    symbol: 'WBTC',
    decimals: 8
};
config.WBTCToken = config.wbtcToken.address;
module.exports = config;


