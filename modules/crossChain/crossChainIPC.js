//require('stepcell');
require('./config.js');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let sendTrans = require('wanchainwalletcore').sendTransaction;
let ethSend = require('wanchainwalletcore').ethSend;
let wanSend = require('wanchainwalletcore').wanSend;
let CoinAmount = require('wanchaintrans').CoinAmount;
let GWeiAmount = require('wanchaintrans').GWeiAmount;

const Windows = require('../windows');
ipc.on('CrossChain_ETH2WETH', (e, data) => {
    console.log('CrossChainIPC : ',data);
    let sendServer = data.chainType == 'ETH' ? ethSend : wanSend;
    if(data.action == 'signLockTrans'){
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        let sendTransaction = new sendTrans(sendServer);
        sendTransaction.createTransaction(data.parameters.tx.from,data.parameters.tx.tokenAddress,new CoinAmount(data.parameters.tx.amount),data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,new GWeiAmount(data.parameters.tx.gasPrice),crossType);
        sendTransaction.trans.setLockData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ',data.value);
            callbackMessage('CrossChain_ETH2WETH',e,data);

        });
    }
    else if(data.action == 'signUnlockTrans'){
        let crossType = (data.chainType == 'ETH') ? 'WETH2ETH' : 'ETH2WETH';
        let sendTransaction = new sendTrans(sendServer);
        sendTransaction.createTransaction(data.parameters.tx.lockTxHash,data.parameters.tx.tokenAddress,null,null,
            null,data.parameters.tx.gas,new GWeiAmount(data.parameters.tx.gasPrice),crossType);
        sendTransaction.trans.setUnlockData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ',data.value);
            callbackMessage('CrossChain_ETH2WETH',e,data);
        });
    }
    else if(data.action == 'signRefundTrans') {
        let sendTransaction = new sendTrans(sendServer);
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        sendTransaction.createTransaction(data.parameters.tx.lockTxHash, data.parameters.tx.tokenAddress, null, null,
            null, data.parameters.tx.gas, new GWeiAmount(data.parameters.tx.gasPrice), crossType);
        sendTransaction.trans.setRefundData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ', sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ', data.value);
            callbackMessage('CrossChain_ETH2WETH', e, data);
        });
    }
    else if(data.action == 'sendRawTrans'){
        sendRawTransactions('CrossChain_ETH2WETH',e,data);
    }
    else if(sendServer[data.action]){
        console.log('sendServer :', data);
        let args = data.parameters;
        console.log(args);
        args.push(function (err,result) {
            data.error = err;
            data.value = result;
            console.log(err,result);
            callbackMessage('CrossChain_ETH2WETH',e,data);

        });
        sendServer[data.action](...args);
    }
});

function callbackMessage(message,e,data){
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    //data.value = 'aaaa';
    senderWindow.send('Callback_'+message, data);
}

function sendRawTransactions(message,e,data) {
    if(data.chainType == 'ETH'){
        ethSend.sendRawTrans(data.parameters.tx,function (err,result) {
            data.error = err;
            data.value = result;
            callbackMessage(message,e,data);
        });
    }
    else {
        wanSend.sendRawTrans(data.parameters.tx,function (err,result) {
            data.error = err;
            data.value = result;
            callbackMessage(message,e,data);
        });
    }
    //data.value = 'aaaa';
}
