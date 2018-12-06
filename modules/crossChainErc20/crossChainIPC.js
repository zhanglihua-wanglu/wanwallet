"use strict";

//require('stepcell');
const config = require('./config.js');
const {app, ipcMain: ipc, shell, webContents} = require('electron');
let WanchainCore = require('wanchain-js-sdk').walletCore;
let {CrossChainE20Approve, CrossChainE20Lock, CrossChainE20Redeem, CrossChainE20Revoke} = require('wanchain-js-sdk').CrossChain;

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


ipc.on('CrossChain_ERC202WERC20', async (e, data) => {
    // console.log('CrossChainIPC : ',data);

    let sendServer = global.sendByWebSocket ? global.sendByWebSocket : null;

    if (data.action === 'getRegErc20Tokens') {
        data.value = await ccUtil.getRegErc20Tokens();
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'getErc20SymbolInfo') {

        data.value = await ccUtil.getErc20SymbolInfo(data.parameters.tokenAddr);
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'getErc20Info') {

        data.value = await ccUtil.getErc20Info(data.parameters.tokenAddr);
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'syncErc20StoremanGroups') {

        data.value = await ccUtil.syncErc20StoremanGroups(data.parameters.tokenAddr);
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'getAddressList') {
        if (data.chainType === 'ETH') {
            data.value = ccUtil.getEthAccounts();
        }
        else {
            data.value = ccUtil.getWanAccounts();
        }
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'listHistory') {

        let addrList = data.parameters.addrList;
        let tokenAddrList = data.parameters.tokenAddrList;
        let symbol = data.parameters.symbol;

        let crossCollection = global.wanDb.queryComm(config.crossCollection, (o) => {
            let bol1 = true ,bol2 = true,bol3 = true;

            if (addrList){
                bol1 = ['from', 'to'].some((item) => {
                    return addrList.includes(o[item]);
                });
            }
            if (symbol){
                bol2 = o['tokenSymbol'] === symbol;
            }
            if (tokenAddrList){
                bol3 = ['srcChainAddr', 'dstChainAddr'].some((item) => {
                    return tokenAddrList.includes(o[item]);
                });
            }

            return bol1 && bol2 && bol3;
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

        if (!typeof crossCollection instanceof Array){
            crossCollection = [crossCollection];
        }
        if (!typeof normalCollection instanceof Array){
            normalCollection = [normalCollection];
        }
        let crossCollectionArr = new Array();
        for(let data of crossCollection){
            data.isNormalTrans = false;
            let canRedeem = ccUtil.canRedeem(data).code;
            let canRevoke = ccUtil.canRevoke(data).code;
            data.isCanRedeem = canRedeem;
            data.isCanRevoke = canRevoke;

            crossCollectionArr.push(data);
        }
        for(let data of normalCollection){
            data.isNormalTrans = true;
            crossCollectionArr.push(data);
        }

        crossCollectionArr.sort(function (a,b) {
           return Number(b.sendTime)- Number(a.sendTime);// time desc
        });

        data.value = {"crossCollection": crossCollectionArr};
        callbackMessage('CrossChain_ERC202WERC20', e, data);
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
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            } else {
                result.gasPrice = Number(r) > 1000000000 ? new BigNumber(r).mul(1.1).toNumber().toFixed() : 1000000000;
                data.value = result;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }
        });
    }
    else if (data.action === 'getBalance') {
        if (data.chainType === 'ETH') {
            try {
                let balance = await ccUtil.getEthBalance(data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            } catch (error) {
                data.error = error.error;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }
        } else {
            try {
                let balance = await ccUtil.getWanBalance(data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            } catch (error) {
                data.error = error.error;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }
        }

    }
    else if (data.action === 'canRedeem') {
        try {
            let canRedeem = ccUtil.canRedeem(data.parameters.record).code;
            data.value = canRedeem;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        } catch (error) {
            data.error = error.error;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
    }
    else if (data.action === 'canRevoke') {
        try {
            let canRevoke = ccUtil.canRevoke(data.parameters.record).code;
            data.value = canRevoke;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        } catch (error) {
            data.error = error.error;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
    }
    else if (data.action == 'getApproveTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);
        let crossChainE20Approve = new CrossChainE20Approve(data.parameters.tx, crossInvokerConfig);

        crossChainE20Approve.txDataCreator = crossChainE20Approve.createDataCreator().result;
        crossChainE20Approve.contractData = crossChainE20Approve.txDataCreator.createContractData().result;

        let approveDataResult = {};
        approveDataResult.approveTransData = crossChainE20Approve.contractData;

        data.value = approveDataResult;

        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'getLockTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);
        let x = ccUtil.generatePrivateKey();
        let hashX = ccUtil.getHashKey(x);
        data.parameters.tx.x = x;
        data.parameters.tx.hashX = hashX;
        let crossChainInstanceLock = new CrossChainE20Lock(data.parameters.tx, crossInvokerConfig);
        crossChainInstanceLock.txDataCreator = crossChainInstanceLock.createDataCreator().result;

        crossChainInstanceLock.contractData = crossChainInstanceLock.txDataCreator.createContractData().result;

        let lockDataResult = {};
        lockDataResult.lockTransData = crossChainInstanceLock.contractData;
        lockDataResult.x = x;
        lockDataResult.hashX = hashX;
        data.value = lockDataResult;

        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'getRefundTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        let crossChainInstanceRedeem = new CrossChainE20Redeem(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRedeem.txDataCreator = crossChainInstanceRedeem.createDataCreator().result;

        crossChainInstanceRedeem.contractData = crossChainInstanceRedeem.txDataCreator.createContractData().result;

        let redeemDataResult = {};
        redeemDataResult.refundTransData = crossChainInstanceRedeem.contractData;

        data.value = redeemDataResult;
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'getRevokeTransData') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        let crossChainInstanceRevoke = new CrossChainE20Revoke(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRevoke.txDataCreator = crossChainInstanceRevoke.createDataCreator().result;

        crossChainInstanceRevoke.contractData = crossChainInstanceRevoke.txDataCreator.createContractData().result;

        let revokeDataResult = {};
        revokeDataResult.revokeTransData = crossChainInstanceRevoke.contractData;

        data.value = revokeDataResult;
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'sendLockTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        data.parameters.tx.password = data.parameters.password;
        let crossChainInstanceLock = new CrossChainE20Lock(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceLock.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }

        } catch (error) {
            log.error("sendLockTrans : ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
    }
    else if (data.action == 'sendRefundTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        data.parameters.tx.password = data.parameters.password;
        let crossChainInstanceRefund = new CrossChainE20Redeem(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceRefund.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }

        } catch (error) {
            log.error("sendDepositX: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }

    }
    else if (data.action == 'sendRevokeTrans') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let tokenOrigAddr = data.parameters.tokenOrigAddr;
        let tokenChainType = data.parameters.tokenChainType;

        //data.chainType = WAN?  WAN=> ERC20
        let srcChain = data.chainType==='WAN'? null:ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType);
        let dstChain = data.chainType==='WAN'? ccUtil.getSrcChainNameByContractAddr(tokenOrigAddr,tokenChainType):null;

        let crossInvokerConfig = ccUtil.getCrossInvokerConfig(srcChain, dstChain);

        data.parameters.tx.password = data.parameters.password;
        let crossChainInstanceRevoke = new CrossChainE20Revoke(data.parameters.tx, crossInvokerConfig);

        try {

            let crossChainInstance = await crossChainInstanceRevoke.run();
            let code = crossChainInstance.code;
            if (code){
                let txHash = crossChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }else{
                data.error = crossChainInstance.result;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }

        } catch (error) {
            log.error("sendWithdrawCancel: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }

    } else if (data.action === 'getMultiTokenBalance') {
        // chainType ETH WAN
        let balanceList = await ccUtil.getMultiTokenBalanceByTokenScAddr(data.parameters.addressList, data.parameters.tokenAddress, data.chainType);
        data.value = balanceList;
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'getWerc20TokenAddressList') {

        let tokenInstanceList = await ccUtil.getRegErc20Tokens();

        let werc20TokenList = [];
        for(let tokenInstance of tokenInstanceList){
            werc20TokenList.push(tokenInstance.tokenWanAddr);
        }
        data.value = werc20TokenList;
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action == 'getCoin2WanRatio') {
        try {
            let c2wRatio = await ccUtil.getToken2WanRatio(data.parameters.tokenOrigAddr,data.chainType);
            data.value = c2wRatio;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        } catch (error) {
            data.error = error.error;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
    }

    // else if (data.action == 'sendRawTrans') {
    //     sendRawTransactions('CrossChain_ERC202WERC20', e, data);
    // }
    else if (data.action == 'sendNormalTransaction') {
        data.parameters.tx.gasPrice = new BigNumber(data.parameters.tx.gasPrice).dividedBy(new BigNumber("1000000000"));
        let srcChain = ccUtil.getSrcChainNameByContractAddr( data.parameters.tokenOrigAddr,data.chainType);
        data.parameters.tx.password = data.parameters.password;
        try {
            let normalChainInstance = await global.crossInvoker.invokeNormalTrans(srcChain,data.parameters.tx);
            let code = normalChainInstance.code;
            if (code){
                let txHash = normalChainInstance.result;
                data.value = txHash;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }else{
                data.error = normalChainInstance.result;
                callbackMessage('CrossChain_ERC202WERC20', e, data);
            }

        } catch (error) {
            log.error("sendNormalTransaction: ", error);
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
    }

    else if (sendServer.hasMessage(data.action)) {

        let args = data.parameters;
        args.push(data.chainType);

        args.push(function (err, result) {
            data.error = err;
            data.value = result;

            callbackMessage('CrossChain_ERC202WERC20', e, data);
        });
        try {
            sendServer.sendMessage(data.action, ...args);
        }catch (error){
            log.error(`method ${data.action} error:`, error);
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
        }
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
    log.debug('wait for wanchainCore.init...');
    await wanchainCore.init(config);
    log.debug('wanchainCore.init...finish!');
}

exports.init = init;

