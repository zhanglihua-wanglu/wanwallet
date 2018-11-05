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

config.wanchainHtlcAddr = "0xd2f14b0067f6fc0d99311c055491b29f01b72004";

config.confirmBlocks = 3;
config.btcConfirmBlocks = 1;
config.feeRate = 300;
config.feeHard = 100000;
config.bitcoinNetwork = bitcoin.networks.testnet;
config.network = 'testnet';


config.wbtcToken = {
    address: "0xa3158cdcb24702e5612d20275745901fbc69331e",
    name: 'Wanchain Btc Crosschain Token',
    symbol: 'WBTC',
    decimals: 8
};
config.WBTCToken = config.wbtcToken.address;
module.exports = config;


