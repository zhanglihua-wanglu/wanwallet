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

config.wanchainHtlcAddr = "0xef1b0855787dc964dda78db9551a2f8732b05ccf";

config.confirmBlocks = 3;
config.btcConfirmBlocks = 1;
config.feeRate = 300;
config.feeHard = 100000;
config.bitcoinNetwork = bitcoin.networks.testnet;
config.network = 'testnet';


config.wbtcToken = {
    address: "0x6a40a70a0bd72de24918e6eec3cdc5e131e6b1cf",
    name: 'Wanchain Btc Crosschain Token',
    symbol: 'WBTC',
    decimals: 8
};
config.WBTCToken = config.wbtcToken.address;
module.exports = config;


