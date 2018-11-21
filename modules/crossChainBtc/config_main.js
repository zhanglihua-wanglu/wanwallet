"use strict";

const bitcoin = require('bitcoinjs-lib');
const config = {};
const path = require('path');
const settings = require('../settings.js');
config.ccLog = path.join(settings.userDataPath,  'crossChainLog.log');
config.ccErr = path.join(settings.userDataPath,  'crossChainErr.log');
config.socketUrl = 'wss://api.wanchain.info';
config.databasePath = settings.userDataPath;


config.wanchainHtlcAddr = "0x50c53a4f6702c2713b3535fc896bc21597534906";

config.confirmBlocks = 12;
config.btcConfirmBlocks = 3;
config.feeRate = 30;
config.feeHard = 10000;
config.bitcoinNetwork = bitcoin.networks.bitcoin;
config.network = 'mainnet';

config.wbtcToken = {
    address: "0xd15e200060fc17ef90546ad93c1c61bfefdc89c7",
    name: 'Wanchain Btc Crosschain Token',
    symbol: 'WBTC',
    decimals: 8
};
config.WBTCToken = config.wbtcToken.address;

module.exports = config;

