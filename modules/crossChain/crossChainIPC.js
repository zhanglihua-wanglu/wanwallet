//require('stepcell');
const config = require('./config.js');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let wanchainCore = require('wanchainwalletcore');
const pu = require('promisefy-util');

// let sendFromSocket = wanchainCore.sendFromSocket;
// let hashContract = wanchainCore.wanchaintrans.hashContract;

const Windows = require('../windows');


ipc.on('CrossChain_ETH2WETH', (e, data) => {
    console.log('CrossChainIPC : ',data);
    let tokenAddress;
    if(data.chainType == 'ETH'){
        tokenAddress = config.originalChainHtlc;
    }else {
        tokenAddress = config.wanchainHtlcAddr;
    }
    let sendServer = (data.chainType == 'ETH') ? wanchainCore.ethSend : wanchainCore.wanSend;
    if(data.action == 'getLockTransData'){
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createTransaction(data.parameters.tx.from,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,data.parameters.tx.gasPrice,crossType);
        sendTransaction.trans.setLockData();
        let lockDataResult = {};
        lockDataResult.lockTransData = sendTransaction.trans.trans.data;
        lockDataResult.secretX = sendTransaction.trans.Contract.key;
        data.value = lockDataResult;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getRefundTransData'){
        let crossType = (data.chainType == 'ETH') ? 'WETH2ETH' : 'ETH2WETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createTransaction(data.parameters.tx.from,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,data.parameters.tx.gasPrice,crossType);
        sendTransaction.trans.setLockData();
        let lockDataResult = {};
        lockDataResult.lockTransData = sendTransaction.trans.trans.data;
        lockDataResult.secretX = sendTransaction.trans.Contract.key;
        data.value = lockDataResult;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getRevokeTransData') {
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        sendTransaction.createTransaction(data.parameters.tx.lockTxHash, tokenAddress, null, null,
            null, data.parameters.tx.gas, new GWeiAmount(data.parameters.tx.gasPrice), crossType);
        sendTransaction.trans.setRefundData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ', sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ', data.value);
            callbackMessage('CrossChain_ETH2WETH', e, data);
        });
    }
    else if(data.action == 'signLockTrans'){
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createTransaction(data.parameters.tx.from,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,data.parameters.tx.gasPrice,crossType);
        sendTransaction.trans.setKey(data.parameters.secretX);
        sendTransaction.trans.setLockData();

        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ',data.value);
            callbackMessage('CrossChain_ETH2WETH',e,data);
        });
    }
    else if(data.action == 'signRefundTrans'){
        let crossType = (data.chainType == 'ETH') ? 'WETH2ETH' : 'ETH2WETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createTransaction(data.parameters.tx.lockTxHash,tokenAddress,null,null,
            null,data.parameters.tx.gas,new GWeiAmount(data.parameters.tx.gasPrice),crossType);
        sendTransaction.trans.setUnlockData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ',data.value);
            callbackMessage('CrossChain_ETH2WETH',e,data);
        });
    }
    else if(data.action == 'signRevokeTrans') {
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        sendTransaction.createTransaction(data.parameters.tx.lockTxHash, tokenAddress, null, null,
            null, data.parameters.tx.gas, new GWeiAmount(data.parameters.tx.gasPrice), crossType);
        sendTransaction.trans.setRefundData();
        sendTransaction.getNonce(function () {
            console.log('sendTransaction.trans : ', sendTransaction.trans.trans);
            data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
            console.log('signed trans : ', data.value);
            callbackMessage('CrossChain_ETH2WETH', e, data);
        });
    }
    else if(data.action == 'getAddressList'){
        if(data.chainType == 'ETH'){
            data.value = Object.keys(wanchainCore.EthKeyStoreDir.Accounts);
        }
        else {
            data.value = Object.keys(wanchainCore.WanKeyStoreDir.Accounts);
        }
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if(data.action == 'sendRawTrans'){
        sendRawTransactions('CrossChain_ETH2WETH',e,data);
    }
    else if(sendServer.hasMessage[data.action]){
        console.log('sendServer :', data);
        let args = data.parameters;
        console.log(args);
        args.push(function (err,result) {
            data.error = err;
            data.value = result;
            console.log(err,result);
            callbackMessage('CrossChain_ETH2WETH',e,data);
        });
        sendServer.sendMessage(data.action , ...args);
    }
});

function callbackMessage(message,e,data){
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    //data.value = 'aaaa';
    senderWindow.send('Callback_'+message, data);
}

function sendRawTransactions(message,e,data) {
    let sendServer = (data.chainType == 'ETH') ? wanchainCore.ethSend : wanchainCore.wanSend;
    sendServer.sendRawTrans(data.parameters.tx,function (err,result) {
            data.error = err;
            data.value = result;
            callbackMessage(message,e,data);
        });
    //data.value = 'aaaa';
}

async function main(){
    await pu.promisefy(wanchainCore.start, [config], wanchainCore);
    console.log("wanchainCore");
    console.log(wanchainCore.sendFromSocket);
    //let backend = new Backend();

}
main();
