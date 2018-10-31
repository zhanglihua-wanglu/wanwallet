"use strict";

const bitcoin = require('bitcoinjs-lib');
const config = {};
const path = require('path');
const settings = require('../settings.js');
config.ccLog = path.join(settings.userDataPath,  'crossChainLog.log');
config.ccErr = path.join(settings.userDataPath,  'crossChainErr.log');
config.socketUrl = 'wss://api.wanchain.info';
config.databasePath = settings.userDataPath;


config.wanchainHtlcAddr = "0x802894ef36050c9b8e94f8d0979c75512491b7d5";

config.confirmBlocks = 12;
config.btcConfirmBlocks = 3;
config.feeRate = 30;
config.feeHard = 10000;
config.bitcoinNetwork = bitcoin.networks.bitcoin;
config.network = 'mainnet';

config.wbtcToken = {
    address: "0xfa4b6988e8cb90bb25e51ea80257ffcdd8ebdd24",
    name: 'Wanchain Btc Crosschain Token',
    symbol: 'WBTC',
    decimals: 8
};
config.WBTCToken = config.wbtcToken.address;

module.exports = config;

