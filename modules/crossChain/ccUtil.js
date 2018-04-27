"use strict";

let wanchainCore = require('wanchainwalletcore');
const config = require('./config.js');

let collection;
let backend;
class Backend {
    constructor() {
        backendConfig.ethGroupAddr = config.originalChainHtlc;
        backendConfig.wethGroupAddr = config.wanchainHtlcAddr;
    }

    async createrSender(ChainType){
        let sender =  wanchainwalletcore.CreaterSender(ChainType);
        await pu.promiseEvent(wanchainwalletcore.CreaterSender, [ChainType], sender.socket.connection, "open");
        return sender;
    }

    async getEthAccountsInfo(sender) {
        let bs;
        try {
            bs = await this.getMultiEthBalances(sender,ethAddrs);
        }
        catch(err){
            console.log("getEthAccountsInfo", err);
        }
        let infos = [];
        for(let i=0; i<ethAddrs.length; i++){
            let info = {};
            info.balance = bs[ethAddrs[i]];
            info.address = ethAddrs[i];
            infos.push(info);
        }

        console.log("Eth Accounts infor: ", infos);
        return infos;
    }
    async getWanAccountsInfo(sender) {
        let bs = await this.getMultiWanBalances(sender,wanAddrs);
        let es = await this.getMultiTokenBalance(sender,wanAddrs);
        let infos = [];
        for(let i=0; i<wanAddrs.length; i++){
            let info = {};
            info.address = wanAddrs[i];
            info.balance = bs[wanAddrs[i]];
            info.wethBalance = es[wanAddrs[i]];
            infos.push(info);
        }

        console.log("Wan Accounts infor: ", infos);
        return infos;
    }

    getEthSmgList(sender) {
        let b = pu.promisefy(sender.sendMessage, ['syncStoremanGroups'], sender);
        return b;
    }
    getTxReceipt(sender,txhash){
        let bs = pu.promisefy(sender.sendMessage, ['getTransactionReceipt',txhash], sender);
        return bs;
    }

    getTxHistory(option) {
        let collection = wanchainwalletcore.getCollection(crossDB,'crossTransaction');
        let Data = collection.find(option);
        let his = [];
        for(var i=0;i<Data.length;++i){
            let Item = Data[i];
            his.push(Item);
        }
        return his;
    }
    async sendEthHash(sender, tx) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(tx.from, backendConfig.ethGroupAddr,tx.value.toString(),tx.to,tx.wanAddr,tx.gas,tx.gasPrice.toString(),'ETH2WETH');
        let txhash =  await pu.promisefy(newTrans.sendLockTrans, [tx.passwd], newTrans);
        return txhash;
    }
    async sendDepositX(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(from, backendConfig.wethGroupAddr,null,null,null,gas,gasPrice,'ETH2WETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRefundTrans, [passwd], newTrans);
        return txhash;
    }
    async sendEthCancel(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(from, backendConfig.ethGroupAddr,null,null,null,gas,gasPrice,'ETH2WETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRevokeTrans, [passwd], newTrans);
        return txhash;
    }
    getEthBalance(sender, addr) {
        let bs = pu.promisefy(sender.sendMessage, ['getBalance',addr], sender);
        return bs;
    }
    getWanBalance(sender, addr) {
        let bs = pu.promisefy(sender.sendMessage, ['getBalance',addr], sender);
        return bs;
    }
    getEthBalancesSlow(sender, adds) {
        let ps = [];

        // TODO: only support one request one time.
        for(let i=0; i<adds.length; i++) {
            let b = pu.promisefy(sender.sendMessage, ['getBalance',adds[i]], sender);
            ps.push(b);
        }
        return ps;
    }
    async sendWanHash(sender, tx) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(tx.from, backendConfig.wethGroupAddr, tx.value.toString(),tx.to,tx.ethAddr,tx.gas,tx.gasPrice.toString(),'WETH2ETH');
        let txhash =  await pu.promisefy(newTrans.sendLockTrans, [tx.passwd], newTrans);
        return txhash;
    }
    async sendWanX(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction( from, backendConfig.ethGroupAddr,null,null,null,gas,gasPrice,'WETH2ETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRefundTrans, [passwd], newTrans);
        return txhash;
    }
    async sendWanCancel(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction( from, backendConfig.wethGroupAddr,null,null,null,gas,gasPrice,'WETH2ETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRevokeTrans, [passwd], newTrans);
        return txhash;
    }

    getMultiEthBalances(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiBalances',addrs], sender);
        return bs;
    }
    getMultiWanBalances(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiBalances',addrs], sender);
        return bs;
    }
    getMultiTokenBalance(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiTokenBalance',addrs], sender);
        return bs;
    }
}


function monitorTask(){
    backend = new Backend();
    console.log("monitorTask");
    collection = walletcore.getCollection(config.crossDbname,config.crossCollection);
    let history = collection.find({ 'status' : { '$ne' : 'finished' } });
    console.log(history);
    history.forEach(function(record,index){
        monitorRecord(record);
    })
}
async function checkHashOnline(chain, record){
    try {
        let sender = await backend.createrSender(chain);
        let receipt = await backend.getTxReceipt(sender,record.txhash);
        if(receipt){
            updateStatus(record.HashX, 'sentHashConfirming');
        }
    }catch(err){
        console.log("checkTxOnline:", err);
    }

}

function updateStatus(key, Status){
    let value = collection.findOne({HashX:trans.Contract.hashKey});
    if(value){
        value.refundTxHash = result;
        collection.update(value);
    }
}

function monitorRecord(record){
    switch(record.status) {
        case 'sentHashPending':
            checkHashOnline(record.chain, record);
            break;

        default:
            // regard as sentHashPending
            break;
    }
}

exports.monitorTask = monitorTask;
