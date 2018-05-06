'use strict'


const pu = require('promisefy-util');
const config = require('./config.js');
const wanchainwalletcore = require('wanchainwalletcore');
const wanUtil = require("wanchain-util");

let crossDB = 'crossTransDb';
let backendConfig = {};
class Backend {
    constructor() {
        backendConfig.ethGroupAddr = config.originalChainHtlc;
        backendConfig.wethGroupAddr = config.wanchainHtlcAddr;
    }

    init(cb){
        wanchainwalletcore.start(config,()=>{
            ethAddrs  = Object.keys(wanchainwalletcore.EthKeyStoreDir.Accounts);
            wanAddrs  = Object.keys(wanchainwalletcore.WanKeyStoreDir.Accounts);
            collection = wanchainwalletcore.getCollection(config.crossDbname,config.crossCollection);
            cb();
        });

    }

    async createrSender(ChainType,local=false){
        if(config.hasLocalNode && ChainType=="WAN" && local){
            return this.createrWeb3Sender(config.rpcIpcPath);
        }else{
            return await this.createrSocketSender(ChainType);
        }

    }
    async createrSocketSender(ChainType){
        let sender =  wanchainwalletcore.CreaterSender(ChainType);
        await pu.promiseEvent(wanchainwalletcore.CreaterSender, [ChainType], sender.socket.connection, "open");
        return sender;
    }
    createrWeb3Sender(url){
        let sender =  wanchainwalletcore.CreaterWeb3Sender(url);
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
    getTxReceipt(sender,txhash){
        let bs = pu.promisefy(sender.sendMessage, ['getTransactionReceipt',txhash], sender);
        return bs;
    }
    getTxHistory(option) {
        collection = wanchainwalletcore.getCollection(crossDB,'crossTransaction');
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
    getDepositOrigenLockEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.depositOriginLockEvent).toString('hex'), null, null, hashX];
        let b = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
        return b;
    }
    getWithdrawOrigenLockEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.withdrawOriginLockEvent).toString('hex'), null, null, hashX];
        let b = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
        return b;
    }
    getWithdrawCrossLockEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.withdrawCrossLockEvent).toString('hex'), null, null, hashX];
        let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
        return p;
    }
    getDepositCrossLockEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.depositCrossLockEvent).toString('hex'), null, null, hashX];
        let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
        return p;
    }
    getDepositOriginRefundEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.depositOriginRefundEvent).toString('hex'), null, null, hashX];
        let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
        return p;
    }
    getWithdrawOriginRefundEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.withdrawOriginRefundEvent).toString('hex'), null, null, hashX];
        let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
        return p;
    }
    getDepositethRevokeEvent(sender, hashX) {
        let topics = ['0x'+wanUtil.sha3(config.ethRevokeEvent).toString('hex'), null,  hashX];
        let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
        return p;
    }
    getDepositHTLCLeftLockedTime(sender, hashX){
        let p = pu.promisefy(sender.sendMessage, ['callScFunc', config.originalChainHtlc, 'getHTLCLeftLockedTime',[hashX],config.HTLCETHInstAbi], sender);
        return p;
    }
    getWithdrawHTLCLeftLockedTime(sender, hashX){
        let p = pu.promisefy(sender.sendMessage, ['callScFunc', config.wanchainHtlcAddr, 'getHTLCLeftLockedTime',[hashX],config.HTLCWETHInstAbi], sender);
        return p;
    }
    monitorTxConfirm(sender, txhash, waitBlocks) {
        let p = pu.promisefy(sender.sendMessage, ['getTransactionConfirm', txhash, waitBlocks], sender);
        return p;
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

    monitorTask(){
        console.log("monitorTask");

        let history = collection.find({ 'status' : { '$ne' : 'finished' } });
        console.log(history);
        let self = this;
        let handlingList = [];
        history.forEach(function(record,index){
            if(record.HashX in handlingList)return;
            handlingList.push(record.HasX);
            self.monitorRecord(record);
            let pos = handlingList.indexOf(record.HashX);
            if(pos != -1){
                handlingList.splice(pos,1);
            }
        })
    }
    async checkOriginLockOnline(record){
        try {
            let sender;
            let receipt;
            if(record.chain == "ETH"){
                sender = await this.createrSender("ETH");
                receipt = await this.getDepositOrigenLockEvent(sender,record.HashX);
            }else {
                sender = await this.createrSender("WAN");
                receipt = await this.getWithdrawOrigenLockEvent(sender,record.HashX);
            }
            if(receipt && receipt.length>0){
                record.status = 'sentHashConfirming';
                this.updateRecord(record );
            }
        }catch(err){
            console.log("checkTxOnline:", err);
        }
    }
    async checkXOnline(record){
        try {
            let sender;
            let receipt;
            if(record.chain == "ETH"){
                sender = await this.createrSender("WAN");
                receipt = await this.getDepositOriginRefundEvent(sender,record.HashX);
            } else {
                sender = await this.createrSender("ETH");
                receipt = await this.getWithdrawOriginRefundEvent(sender,record.HashX);
            }
            if(receipt && receipt.length>0){
                record.status = 'sentXConfirming';
                this.updateRecord(record );
            }
        }catch(err){
            console.log("checkTxOnline:", err);
        }
    }
    async checkRevokeOnline(chain, record){
        try {
            let sender = await this.createrSender(chain);
            let receipt = await this.getethRevokeEvent(sender,record.HashX);
            if(receipt && receipt.length>0){
                record.status = 'sentRevokeConfirming';
                this.updateRecord(record );
            }
        }catch(err){
            console.log("checkTxOnline:", err);
        }
    }
    async checkHashConfirm(record, waitBlocks){
        try {
            let sender = await this.createrSender(record.chain);
            let receipt = await this.monitorTxConfirm(sender, record.lockTxHash, waitBlocks);
            if(receipt){
                record.lockConfirmed += 1;
                if(record.lockConfirmed >= config.confirmBlocks){
                    record.status = 'waitingCross';
                }
                this.updateRecord(record);
            }
        }catch(err){
            console.log("checkHashConfirm:", err);
        }
    }
    async checkXConfirm(record, waitBlocks){
        try {
            let chain = record.chain=='ETH'?"WAN":"ETH";
            let sender = await this.createrSender(chain);
            let receipt = await this.monitorTxConfirm(sender, record.refundTxHash, waitBlocks);
            if(receipt){
                record.refundConfirmed += 1;
                if(record.refundConfirmed >= config.confirmBlocks){
                    record.status = 'finished';
                }
                this.updateRecord(record);
            }
        }catch(err){
            console.log("checkXConfirm:", err);
        }
    }
    async checkRevokeConfirm(chain, record, waitBlocks){
        try {
            let sender = await this.createrSender(chain);
            let receipt = await this.monitorTxConfirm(sender, record.revokeTxHash, waitBlocks);
            if(receipt){
                record.revokeConfirmed += 1;
                if(record.revokeConfirmed >= config.confirmBlocks){
                    record.status = 'finished';
                }
                this.updateRecord(record);
            }
        }catch(err){
            console.log("checkHashConfirm:", err);
        }
    }
    async checkCrossHashConfirm(record, waitBlocks){
        try {
            let chain = record.chain=='ETH'?"WAN":"ETH";
            let sender = await this.createrSender(chain);
            let receipt = await this.monitorTxConfirm(sender, record.crossLockHash, waitBlocks);
            if(receipt){
                if(!record.crossConfirmed) record.crossConfirmed = 0;
                record.crossConfirmed += 1;
                if(record.crossConfirmed >= config.confirmBlocks){
                    record.status = 'waitingX';
                }
                this.updateRecord(record);
            }
        }catch(err){
            console.log("checkTxOnline:", err);
        }
    }
    async checkHashTimeout( record){
        if(record.status == "waitingRevoke,"
            || record.status =="sentRevokePending"
            || record.status =="sentRevokeConfirming"){
            return true;
        }
        try {
            let sender = await this.createrSender(record.chain);
            let timeout;
            if(record.chain == "ETH"){
                timeout = await this.getDepositHTLCLeftLockedTime(sender, record.HashX);
            }else {
                timeout = await this.getWithdrawHTLCLeftLockedTime(sender, record.HashX);
            }
            if(timeout == "0"){
                record.status = 'waitingRevoke';
                this.updateRecord(record);
                console.log("Timeouted");
                return true;
            }
        }catch(err){
            console.log("checkHashTimeout:", err);
        }
        return false;
    }
    async checkCrossHashOnline(record){
        try {
            let receipt;
            if(record.chain=="ETH"){
                let sender = await this.createrSender("WAN");
                receipt = await this.getDepositCrossLockEvent(sender,record.HashX);
            }else {
                let sender = await this.createrSender("ETH");
                receipt = await this.getWithdrawCrossLockEvent(sender,record.HashX);
            }
            if(receipt && receipt.length>0){
                record.crossConfirmed = 1;
                record.crossLockHash = receipt[0].transactionHash;
                record.status = 'waitingCrossConfirming';
                this.updateRecord(record);
                console.log("######waitingCross done ");
            }
        }catch(err){
            console.log("checkTxOnline:", err);
        }
    }
    updateRecord(record){
        collection.update(record);
    }

    updateStatus(key, Status){
        let value = collection.findOne({HashX:key});
        if(value){
            value.status = Status;
            collection.update(value);
        }
    }

    async monitorRecord(record){
        let waitBlock = config.confirmBlocks;
        let chain = record.chain;
        // if(this.checkHashTimeout(record) == true){
        //     console.log("tx timeout: ", record);
        // }

        switch(record.status) {
            case 'sentHashPending':
                await this.checkOriginLockOnline(record);
                break;
            case 'sentHashConfirming':
                waitBlock = record.lockConfirmed < config.confirmBlocks ? record.lockConfirmed: config.confirmBlocks;
                await this.checkHashConfirm(record, waitBlock);
                console.log("######sentHashConfirming confirmed ", record.lockConfirmed);
                break;
            case 'waitingCross':
                await this.checkCrossHashOnline(record);
                break;
            case 'waitingCrossConfirming':
                if(record.refundTxHash){
                    record.status = 'sentXPending';
                    this.updateRecord(record);
                    break;
                }
                await this.checkCrossHashConfirm( record, config.confirmBlocks);
                console.log("######waitingCrossConfirming  ", record.crossConfirmed);
                break;
            case 'waitingX':
                if(record.refundTxHash){
                    record.status = 'sentXPending';
                    this.updateRecord(record);
                }
                break;
            case 'waitingRevoke':
                if(record.revokeTxHash){
                    record.status = 'sentRevokePending';
                    this.updateRecord(record);
                }
                break;
            case 'sentRevokePending':
                await this.checkRevokeOnline(record.chain, record);
                break;
            case 'sentRevokeConfirming':
                waitBlock = record.lockConfirmed < config.confirmBlocks ? record.lockConfirmed: config.confirmBlocks;
                await this.checkRevokeConfirm(record.chain, record, waitBlock);
                console.log("######sentHashConfirming confirmed ", record.lockConfirmed);
                break;

            case 'sentXPending':
                await this.checkXOnline(record);
                break;
            case 'sentXConfirming':
                chain = record.chain=='ETH'?"WAN":"ETH";
                waitBlock = record.refundConfirmed < config.confirmBlocks ? record.refundConfirmed: config.confirmBlocks;
                await this.checkXConfirm(record, waitBlock);
                console.log("######sentXConfirming confirmed ", record.refundConfirmed);
                break;

            case 'finished':
                break;
            default:
                break;
        }
    }



}

let ethAddrs;
let wanAddrs;
let collection;
exports.Backend = Backend;