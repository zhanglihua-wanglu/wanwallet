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

    if (sendServer.webSocket.readyState != 1) {
        try {
            await wanchainCore.init();
        } catch (error) {
            log.error("Failed to connect to apiserver:", error.toString());
            data.error = error.toString();
            callbackMessage('CrossChain_ERC202WERC20', e, data);
            return;
        }
    }

    if (data.action === 'getRegErc20Tokens') {
        data.value = await ccUtil.getRegErc20Tokens();
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    }
    else if (data.action === 'getErc20SymbolInfo') {

        data.value = await ccUtil.getErc20SymbolInfo(data.parameters.tokenAddr);
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

        let collection = global.wanDb.getCollection(config.crossCollection);

        data.value = collection;
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
                result.gasPrice = Number(r) > 10000000000 ? r : 10000000000;
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
        let crossChainInstanceLock = new CrossChainE20Lock(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceLock.txDataCreator = crossChainInstanceLock.createDataCreator().result;

        crossChainInstanceLock.contractData = crossChainInstanceLock.txDataCreator.createContractData().result;

        let lockDataResult = {};
        lockDataResult.lockTransData = crossChainInstanceLock.contractData;

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

        // crossChainInstanceLock.trans = crossChainInstanceLock.createTrans().result;
        // crossChainInstanceLock.txDataCreator = crossChainInstanceLock.createDataCreator().result;
        //
        // crossChainInstanceLock.dataSign = crossChainInstanceLock.createDataSign().result;
        // crossChainInstanceLock.commonData = (await crossChainInstanceLock.txDataCreator.createCommonData()).result;
        // crossChainInstanceLock.contractData = crossChainInstanceLock.txDataCreator.createContractData().result;
        //
        // crossChainInstanceLock.trans.setCommonData(crossChainInstanceLock.commonData);
        // crossChainInstanceLock.trans.setContractData(crossChainInstanceLock.contractData);
        //
        // crossChainInstanceLock.input.password = data.parameters.password;

        try {
            // let signedData = crossChainInstanceLock.dataSign.sign(crossChainInstanceLock.trans).result;
            //
            // crossChainInstanceLock.preSendTrans(signedData);
            //
            // let txHash = await crossChainInstanceLock.sendTrans(signedData);
            //
            // crossChainInstanceLock.postSendTrans(txHash);

            let txHash = (await crossChainInstanceLock.run()).result;
            data.value = txHash;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
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

        let crossChainInstanceRefund = new CrossChainE20Redeem(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRefund.trans = crossChainInstanceRefund.createTrans().result;
        crossChainInstanceRefund.txDataCreator = crossChainInstanceRefund.createDataCreator().result;

        crossChainInstanceRefund.dataSign = crossChainInstanceRefund.createDataSign().result;
        crossChainInstanceRefund.commonData = (await crossChainInstanceRefund.txDataCreator.createCommonData()).result;
        crossChainInstanceRefund.contractData = crossChainInstanceRefund.txDataCreator.createContractData().result;

        crossChainInstanceRefund.trans.setCommonData(crossChainInstanceRefund.commonData);
        crossChainInstanceRefund.trans.setContractData(crossChainInstanceRefund.contractData);

        crossChainInstanceRefund.input.password = data.parameters.password;

        try {
            let signedData = crossChainInstanceRefund.dataSign.sign(crossChainInstanceRefund.trans).result;

            crossChainInstanceRefund.preSendTrans(signedData);

            let txHash = await crossChainInstanceRefund.sendTrans(signedData);

            crossChainInstanceRefund.postSendTrans(txHash);

            data.value = txHash;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
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

        let crossChainInstanceRevoke = new CrossChainE20Revoke(data.parameters.tx, crossInvokerConfig);

        crossChainInstanceRevoke.trans = crossChainInstanceRevoke.createTrans().result;
        crossChainInstanceRevoke.txDataCreator = crossChainInstanceRevoke.createDataCreator().result;

        crossChainInstanceRevoke.dataSign = crossChainInstanceRevoke.createDataSign().result;
        crossChainInstanceRevoke.commonData = (await crossChainInstanceRevoke.txDataCreator.createCommonData()).result;
        crossChainInstanceRevoke.contractData = crossChainInstanceRevoke.txDataCreator.createContractData().result;

        crossChainInstanceRevoke.trans.setCommonData(crossChainInstanceRevoke.commonData);
        crossChainInstanceRevoke.trans.setContractData(crossChainInstanceRevoke.contractData);

        crossChainInstanceRevoke.input.password = data.parameters.password;

        try {
            let signedData = crossChainInstanceRevoke.dataSign.sign(crossChainInstanceRevoke.trans).result;

            crossChainInstanceRevoke.preSendTrans(signedData);

            let txHash = await crossChainInstanceRevoke.sendTrans(signedData);

            crossChainInstanceRevoke.postSendTrans(txHash);

            data.value = txHash;
            callbackMessage('CrossChain_ERC202WERC20', e, data);
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
            let c2wRatio = await ccUtil.getEthC2wRatio();
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
    // else if (data.action == 'sendNormalTransaction') {
    //     sendNormalTransaction('CrossChain_ERC202WERC20', e, data);
    // }

    else if (sendServer.hasMessage(data.action)) {

        let args = data.parameters;
        args.push(data.chainType);

        args.push(function (err, result) {
            data.error = err;
            data.value = result;

            callbackMessage('CrossChain_ERC202WERC20', e, data);
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

async function sendNormalTransaction(message, e, data) {
    let tx = data.parameters.tx;
    let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
    sendTransaction.createNormalTransaction(tx.from, tx.to, tx.value, tx.gas, toGweiString(tx.gasPrice), tx.nonce);
    sendTransaction.sendNormalTrans(data.parameters.passwd, function (err, result) {
        data.error = err;
        data.value = result;
        callbackMessage('CrossChain_ERC202WERC20', e, data);
    });
}

async function init() {
    wanchainCore = new WanchainCore(config);
    await wanchainCore.init(config);
}

exports.init = init;

