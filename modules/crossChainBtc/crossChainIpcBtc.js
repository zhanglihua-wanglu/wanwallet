"use strict";
const config = require('./config.js');

const log = config.getLogger('crossChain-BTC');
log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>crossChainIpcBtc entered<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
//require('stepcell');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCoreBTC = require('wanchain-crosschain-btc');

//const logger = require('../utils/logger');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const Windows = require('../windows.js');

let btcScripts = require('./btcScripts');

let wanchainCore;
let be;
let ccUtil;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    log.debug('data:', JSON.stringify(data, null, 4));
    let tokenAddress;
    let sendServer = (data.chainType === 'BTC') ? wanchainCore.btcSend : wanchainCore.wanSend;
    if(data.chainType === 'BTC'){
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
            return;
        }
    }

    if(data.action === 'createBtcAddress'){
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>createBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        wanchainCore.btcUtil.createAddress(data.parameters).then((newAddress)=>{
            data.value = newAddress;
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        });
    }
    else if(data.action === 'listBtcAddress') {
        try{
            log.debug('CrossChain_BTC2WBTC->>>>>>>>>listBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            wanchainCore.btcUtil.getAddressList().then((addressList)=>{
                addressList.forEach(function(Array, index){
                    log.debug(config.consoleColor.COLOR_FgYellow, (index +1) + ': ' + Array.address, '\x1b[0m');
                });
                data.value = addressList;
                callbackMessage('CrossChain_BTC2WBTC', e, data);
            });
        } catch (e) {
            log.error("Failed to listBtcAddress:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'getBtcBalance') {
        try {
            log.debug('CrossChain_BTC2WBTC->>>>>>>>>getBtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            let addressList = await wanchainCore.btcUtil.getAddressList();
            let array = [];

            if (addressList.length === 0) {
                log.debug('address list lenght === 0');

                data.value = null;

                callbackMessage('CrossChain_BTC2WBTC', e, data);
                return;
            }

            for (let i = 0; i < addressList.length; i++) {
                array.push(addressList[i].address)
            }

            let utxos = await wanchainCore.ccUtil.getBtcUtxo(wanchainCore.ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
            let result = await wanchainCore.ccUtil.getUTXOSBalance(utxos);

            let print = 'btcBalance: ' + web3.toBigNumber(result).div(100000000).toString();

            log.debug(print);

            data.value = web3.toBigNumber(result).div(100000000).toString();

            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (e) {
            log.error("Failed to getBtcBalance:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'getBtcMultiBalances') {
        try {
            log.debug('CrossChain_BTC2WBTC->>>>>>>>>getBtcMultiBalances>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            let addressList = await wanchainCore.btcUtil.getAddressList();


            if (addressList.length === 0) {
                log.debug('address list lenght === 0');

                data.value = null;

                callbackMessage('CrossChain_BTC2WBTC', e, data);
                return;
            }

            data.value = {};

            for (let i = 0; i < addressList.length; i++) {
                let array = [];

                array.push(addressList[i].address)

                let utxos = await wanchainCore.ccUtil.getBtcUtxo(wanchainCore.ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
                let result = await wanchainCore.ccUtil.getUTXOSBalance(utxos);

                let print = 'btcBalance: ' + web3.toBigNumber(result).div(100000000).toString();

                log.debug(print);

                data.value[addressList[i].address] = web3.toBigNumber(result).div(100000000).toString();

                array.pop();
            }

            log.debug('getBtcMultiBalances finish, data:');
            log.debug(JSON.stringify(data, null, 4));

            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (e) {
            log.error("Failed to getBtcBalance:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'sendBtcToAddress') {
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        try {
            if(!data.parameters) {
                throw new Error('parameters is null.');
            }

            if(data.parameters.length !== 3) {
                throw new Error('parameters count error.');
            }

            let amount = data.parameters[0];
            let to = data.parameters[1];
            let passwd = data.parameters[2];

            if (! btcScripts.checkBalance(amount, null) ||
                ! to.length > 0 ||
                ! btcScripts.checkPasswd(passwd)) {

                throw new Error('parameters infomation error.');
            }

            let btcBalance = 0;
            let addressList;
            let utxos;
            // btc balance

            addressList = await wanchainCore.btcUtil.getAddressList();
            let array = [];
            for (let i = 0; i < addressList.length; i++) {
                array.push(addressList[i].address)
            }

            utxos = await wanchainCore.ccUtil.getBtcUtxo(wanchainCore.ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);

            let result = await wanchainCore.ccUtil.getUTXOSBalance(utxos);

            btcBalance = web3.toBigNumber(result).div(100000000);

            if (! btcScripts.checkBalance(amount, btcBalance) ) {

                throw new Error('Balance not enough.')
            }

            let keyPairArray = [];

            keyPairArray = await wanchainCore.btcUtil.getECPairs(passwd);

            if (keyPairArray.length === 0) {
                throw new Error('no bitcoin keyPairs!');
            }

            let target = {
                address: to,
                value: web3.toBigNumber(amount).mul(100000000)
            };

            const { rawTx, fee } = await wanchainCore.ccUtil.btcBuildTransaction(utxos, keyPairArray, target, config.feeRate);
            if (!rawTx) {
                throw new Error('btcBuildTransaction error.');
            }

            let result2 = await wanchainCore.ccUtil.sendRawTransaction(wanchainCore.ccUtil.btcSender, rawTx);
            log.debug('hash: ', result2);
            data.value = 'success';
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (error) {
            log.error("Failed to sendBtcToAddress:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if (data.action === 'listWbtcBalance') {
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>listWbtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        try {
            let wanAddressList = [];
            let wethBalance;
            data.value = {};

            wanAddressList = await wanchainCore.ccUtil.getWanAccountsInfo(wanchainCore.ccUtil.wanSender);
            log.debug(sprintf("%20s %58s", "WAN address", "WBTC balance"));

            wanAddressList.forEach(function(wanAddress, index){
                wethBalance = web3.toBigNumber(wanAddress.wethBalance).div(100000000);
                data.value[wanAddress.address] = wethBalance;
            });
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (error) {
            log.error("Failed to listWbtcBalance:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'listStoremanGroups') {
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>listStoremanGroups>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        try {
            let smgs = await wanchainCore.ccUtil.getBtcSmgList(wanchainCore.ccUtil.btcSender);
            data.value = smgs;
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (error) {
            log.error("Failed to listStoremanGroups:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'listTransactions') {
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        try {
            let records = ccUtil.getBtcWanTxHistory({});

            records = records.filter((value)=>{
                retrun (value.crossAdress !== '');
            });

            data.value = records;
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (error) {
            log.error("Failed to listTransactions:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action === 'lockBtc') {
        try {

            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (error) {
            log.error("Failed to lockBtc:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
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
    wanchainCore.ccUtil = wanchainCore.be;
    ccUtil = wanchainCore.be;
    await wanchainCore.init(config);
}
exports.init = init;

