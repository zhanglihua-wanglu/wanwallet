"use strict";

//require('stepcell');
const config = require('./config.js');
const {app, ipcMain: ipc, shell, webContents} = require('electron');
let WanchainCore = require('wanchain-js-sdk').walletCore;
let {CrossChainEthLock, CrossChainEthRedeem, CrossChainEthRevoke} = require('wanchain-js-sdk').CrossChain;

let ccUtil = require('wanchain-js-sdk').ccUtil;

const pu = require('promisefy-util');
const BigNumber = require('bignumber.js');
//const logger = require('../utils/logger');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const Windows = require('../windows');

function toGweiString(swei) {
    let exp = new BigNumber(10);
    let wei = new BigNumber(swei);
    let gwei = wei.dividedBy(exp.pow(9));
    return gwei.toString(10);
}

let wanchainCore;

const log = config.getLogger('crossChain');


ipc.on('CrossChain_ETH2WETH', async (e, data) => {
    // console.log('CrossChainIPC : ',data);

    let sendServer = global.sendByWebSocket ? global.sendByWebSocket : null;

    if (sendServer.webSocket.readyState != 1) {
        try {
            await wanchainCore.init();
        } catch (error) {
            log.error("Failed to connect to apiserver:", error.toString());
            data.error = error.toString();
            callbackMessage('CrossChain_ETH2WETH', e, data);
            return;
        }
    }

    if (data.action === 'getAddressList') {
        if (data.chainType === 'ETH') {
            data.value = ccUtil.getEthAccounts();
        }
        else {
            data.value = ccUtil.getWanAccounts();
        }
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action === 'listHistory') {

        // let addrList = data.parameters.addrList;
        let tokenAddrList = data.parameters.tokenAddrList;
        let symbol = data.parameters.symbol;

        let crossCollection = global.wanDb.queryComm(config.crossCollection, (o) => {
            let bol1 = true ,bol2 = true;

            if (symbol){
                bol1 = o['tokenSymbol'] === symbol;
            }
            if (tokenAddrList){
                bol2 = ['srcChainAddr', 'dstChainAddr'].some((item) => {
                    return tokenAddrList.includes(o[item]);
                });
            }

            return bol1 && bol2;
        });

        let normalCollection = global.wanDb.queryComm(config.normalCollection, (o) => {
            let bol1 = true ,bol2 = true;

            if (symbol){
                bol1 = o['tokenSymbol'] === symbol;
            }

            if (data.chainType){
                bol2 = o['chainType'] === data.chainType;
            }

            return bol1 && bol2;
        });

        data.value = {"crossCollection":crossCollection, "normalCollection":normalCollection};
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action === 'getGasPrice') {
        let result = {};
        if (data.chainType === 'ETH') {
            result.ethNormalGas = config.ethNormalGas;
            result.LockGas = config.ethLockGas;
            result.RefundGas = config.ethRefundGas;
            result.RevokeGas = config.ethRevokeGas;

        } else {
            result.LockGas = config.wanLockGas;
            result.RefundGas = config.wanRefundGas;
            result.RevokeGas = config.wanRevokeGas;
            data.value = result;
        }
        sendServer.sendMessage('getGasPrice', data.chainType, function (err, r) {
            if (err) {
                data.err = err;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            } else {
                result.gasPrice = Number(r) > 1000000000 ? r : 1000000000;
                data.value = result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
        });
    }
    else if (data.action === 'getBalance') {
        if (data.chainType === 'ETH') {
            try {
                let balance = await ccUtil.getEthBalance(data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            } catch (error) {
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
        } else {
            try {
                let balance = await ccUtil.getWanBalance(data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            } catch (error) {
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
        }

    }
    else if (data.action == 'getLockTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN?  WAN=> ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);
        let crossChainInstanceLock = new CrossChainEthLock(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceLock.txDataCreator = crossChainInstanceLock.createDataCreator().result;

        crossChainInstanceLock.contractData = crossChainInstanceLock.txDataCreator.createContractData().result;

        let lockDataResult = {};
        lockDataResult.lockTransData = crossChainInstanceLock.contractData;

        data.value = lockDataResult;

        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action == 'getRefundTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN? WAN => ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        let crossChainInstanceRefund = new CrossChainEthRedeem(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRefund.txDataCreator = crossChainInstanceRefund.createDataCreator().result;

        crossChainInstanceRefund.contractData = crossChainInstanceRefund.txDataCreator.createContractData().result;

        let refundDataResult = {};
        refundDataResult.refundTransData = crossChainInstanceRefund.contractData;

        data.value = refundDataResult;
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action == 'getRevokeTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN?  WAN=> ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        let crossChainInstanceRevoke = new CrossChainEthRevoke(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRevoke.txDataCreator = crossChainInstanceRevoke.createDataCreator().result;

        crossChainInstanceRevoke.contractData = crossChainInstanceRevoke.txDataCreator.createContractData().result;

        let revokeDataResult = {};
        revokeDataResult.revokeTransData = crossChainInstanceRevoke.contractData;

        data.value = revokeDataResult;
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action == 'sendLockTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN?  WAN=> ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);
        data.parameters.tx.password = data.parameters.password;

        let crossChainInstanceLock = new CrossChainEthLock(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceLock.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }

        } catch (error) {
            log.error("sendLockTrans : ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }
    }
    else if (data.action == 'sendRefundTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN?  WAN=> ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        data.parameters.tx.password = data.parameters.password;
        let crossChainInstanceRedeem = new CrossChainEthRedeem(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceRedeem.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }

        } catch (error) {
            log.error("sendDepositX: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }

    }
    else if (data.action == 'sendRevokeTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));

        //data.chainType = WAN?  WAN=> ETH
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr("ETH","ETH"):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        data.parameters.tx.password = data.parameters.password;
        let crossChainInstanceRevoke = new CrossChainEthRevoke(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceRevoke.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }

        } catch (error) {
            log.error("sendWithdrawCancel: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }

    } else if (data.action == 'getMultiTokenBalance') {
        try {
            let balanceList = await ccUtil.getMultiTokenBalanceByTokenScAddr(data.parameters[0], config.ethTokenAddressOnWan, "WAN");
            data.value = balanceList;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        } catch (error) {
            data.error = error.error;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }
    }
    else if (data.action == 'getWethToken') {
        data.value = config.wethToken;
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if (data.action == 'getCoin2WanRatio') {
        try {
            let c2wRatio = await ccUtil.getEthC2wRatio();
            data.value = c2wRatio;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        } catch (error) {
            data.error = error.error;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }
    }

    // else if (data.action == 'sendRawTrans') {
    //     sendRawTransactions('CrossChain_ETH2WETH', e, data);
    // }
    else if (data.action === 'sendNormalTransaction') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let srcChain = ccUtil.getSrcChainNameByContractAddr("ETH","ETH");
        data.parameters.tx.password = data.parameters.password;

        try {
            let normalChainInstance = await global.crossInvoker.invokeNormalTrans(srcChain,data.parameters.tx);
            let code = normalChainInstance.code;
            if (code){
                let txHash = normalChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }else{
                data.error = normalChainInstance.result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }

        } catch (error) {
            log.error("sendNormalTransaction: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }
    }
    else if (sendServer.hasMessage(data.action)) {

        let args = data.parameters;
        args.push(data.chainType);

        args.push(function (err, result) {
            data.error = err;
            data.value = result;

            callbackMessage('CrossChain_ETH2WETH', e, data);
        });

        sendServer.sendMessage(data.action, ...args);
    }
});

function callbackMessage(message, e, data) {
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    senderWindow.send('Callback_' + message, data);
}

function sendRawTransactions(message, e, data) {
    let sendServer = global.sendByWebSocket ? global.sendByWebSocket : null;
    sendServer.sendRawTrans(data.parameters.tx, function (err, result) {
        data.error = err;
        data.value = result;
        callbackMessage(message, e, data);
    });
}

async function init() {
    wanchainCore = new WanchainCore(config);
    await wanchainCore.init(config);
}

exports.init = init;

