"use strict";
const config = require('./configBtc.js');

const log = config.getLogger('crossChain-BTC');
log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>crossChainIpcBtc entered<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
//require('stepcell');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCoreBTC = require('wanchain-crosschain-btc');

//const logger = require('../utils/logger');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const Windows = require('../windows.js');

let wanchainCore;
let be;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    log.debug('data:', JSON.stringify(data, null, 4));
    let tokenAddress;
    let sendServer = (data.chainType == 'BTC') ? wanchainCore.btcSend : wanchainCore.wanSend;
    if(data.chainType == 'BTC'){
        tokenAddress = config.originalChainHtlc;
    }else {
        tokenAddress = config.wanchainHtlcAddr;
    }

    if(sendServer.socket.connection.readyState != 1){
        try {
            await wanchainCore.reinit(config);
        }catch(error){
            log.error("Failed to connect to apiserver:", error.toString());
            data.error = error.toString();
            callbackMessage('CrossChain_BTC2WBTC',e,data);
            return
        }
    }

    if(data.action == 'createBtcAddress'){
        wanchainCore.btcUtil.createAddress(data.parameters).then((newAddress)=>{
            data.value = newAddress;
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        });
    }
    else if(sendServer.hasMessage(data.action)){
        // console.log('sendServer :', data);
        let args = data.parameters;
        // console.log(args);
        args.push(function (err,result) {
            data.error = err;
            data.value = result;
            // console.log(err,result);
            callbackMessage('CrossChain_BTC2WBTC',e,data);
        });
        sendServer.sendMessage(data.action , ...args);
    }
});

function callbackMessage(message,e,data){
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    senderWindow.send('Callback_'+message, data);
}

async function init(){
    wanchainCore = new WanchainCoreBTC(config);
    be = wanchainCore.be;
    await wanchainCore.init(config);
}
exports.init = init;

