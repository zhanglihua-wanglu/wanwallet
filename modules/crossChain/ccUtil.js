'use strict'

const pu = require('promisefy-util');
const config = require('./config.js');
const BigNumber = require('bignumber.js');
const wanchainwalletcore = require('wanchainwalletcore');
const wanUtil = require("wanchain-util");
const keythereum = require("keythereum");
keythereum.constants.quiet = true;
const logger = config.logDebug.getLogger("crossChain util");

let backendConfig = {};
const Backend = {
    toGweiString(swei){
        let exp = new BigNumber(10);
        let wei = new BigNumber(swei);
        let gwei = wei.dividedBy(exp.pow(9));
        return  gwei.toString(10);
    },
    async init(){
        backendConfig.ethGroupAddr = config.originalChainHtlc;
        backendConfig.wethGroupAddr = config.wanchainHtlcAddr;
        await pu.promisefy(wanchainwalletcore.start,[config], wanchainwalletcore);
        this.ethSender = await this.createrSocketSender("ETH");
        this.wanSender = await this.createrSocketSender("WAN");
        this.ethAddrs  = Object.keys(wanchainwalletcore.EthKeyStoreDir.getAccounts());
        this.wanAddrs  = Object.keys(wanchainwalletcore.WanKeyStoreDir.getAccounts());
        this.collection = wanchainwalletcore.getCollection(config.crossDbname,config.crossCollection);
    },
    getSenderbyChain(chainType){
        return chainType == "ETH"? this.ethSender : this.wanSender;
    },
    async createrSender(ChainType,local=false){
        if(config.hasLocalNode && ChainType=="WAN" && local){
            return this.createrWeb3Sender(config.rpcIpcPath);
        }else{
            return await this.createrSocketSender(ChainType);
        }

    },
    async createrSocketSender(ChainType){
        let sender =  wanchainwalletcore.CreaterSender(ChainType);
        await pu.promiseEvent(wanchainwalletcore.CreaterSender, [ChainType], sender.socket.connection, "open");
        return sender;
    },
    createrWeb3Sender(url){
        let sender =  wanchainwalletcore.CreaterWeb3Sender(url);
        return sender;
    },

    async getEthAccountsInfo(sender) {
        let bs;
        try {
            this.ethAddrs  = Object.keys(wanchainwalletcore.EthKeyStoreDir.getAccounts());
            bs = await this.getMultiEthBalances(sender,this.ethAddrs);
        }
        catch(err){
            logger.error("getEthAccountsInfo", err);
            return [];
        }
        let infos = [];
        for(let i=0; i<this.ethAddrs.length; i++){
            let info = {};
            info.balance = bs[this.ethAddrs[i]];
            info.address = this.ethAddrs[i];
            infos.push(info);
        }

        logger.debug("Eth Accounts infor: ", infos);
        return infos;
    },
    async getWanAccountsInfo(sender) {
        this.wanAddrs  = Object.keys(wanchainwalletcore.WanKeyStoreDir.getAccounts());
        let bs = await this.getMultiWanBalances(sender,this.wanAddrs);
        let es = await this.getMultiTokenBalance(sender,this.wanAddrs);
        let infos = [];
        for(let i=0; i<this.wanAddrs.length; i++){
            let info = {};
            info.address = this.wanAddrs[i];
            info.balance = bs[this.wanAddrs[i]];
            info.wethBalance = es[this.wanAddrs[i]];
            infos.push(info);
        }

        logger.debug("Wan Accounts infor: ", infos);
        return infos;
    },

    getEthSmgList(sender) {
        let b = pu.promisefy(sender.sendMessage, ['syncStoremanGroups'], sender);
        return b;
    },
    getTxReceipt(sender,txhash){
        let bs = pu.promisefy(sender.sendMessage, ['getTransactionReceipt',txhash], sender);
        return bs;
    },

    createEthAddr(keyPassword){
        let params = { keyBytes: 32, ivBytes: 16 };
        let dk = keythereum.create(params);
        let options = {
            kdf: "scrypt",
            cipher: "aes-128-ctr",
            kdfparams: {
                n: 8192,
                dklen: 32,
                prf: "hmac-sha256"
            }
        };
        let keyObject = keythereum.dump(keyPassword, dk.privateKey, dk.salt, dk.iv, options);
        keythereum.exportToFile(keyObject,config.ethKeyStorePath);
        return keyObject.address;
    },
    createWanAddr(keyPassword) {
        let params = { keyBytes: 32, ivBytes: 16 };
        let options = {
            kdf: "scrypt",
            cipher: "aes-128-ctr",
            kdfparams: {
                n: 8192,
                dklen: 32,
                prf: "hmac-sha256"
            }
        };
        let dk = keythereum.create(params);
        let keyObject = keythereum.dump(keyPassword, dk.privateKey, dk.salt, dk.iv, options);

        let dk2 = keythereum.create(params);
        let keyObject2 = keythereum.dump(keyPassword, dk2.privateKey, dk2.salt, dk2.iv, options);
        keyObject.crypto2 = keyObject2.crypto;

        keyObject.waddress = wanUtil.generateWaddrFromPriv(dk.privateKey, dk2.privateKey).slice(2);
        keythereum.exportToFile(keyObject, config.wanKeyStorePath);
        return keyObject.address;
    },
    getTxHistory(option) {
        let Data = this.collection.find(option);
        let his = [];
        for(var i=0;i<Data.length;++i){
            let Item = Data[i];
            his.push(Item);
        }
        return his;
    },
    async sendEthHash(sender, tx) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(tx.from, backendConfig.ethGroupAddr,tx.value.toString(),tx.to,tx.wanAddr,tx.gas,this.toGweiString(tx.gasPrice.toString()),'ETH2WETH',tx.nonce);
        let txhash =  await pu.promisefy(newTrans.sendLockTrans, [tx.passwd], newTrans);
        return txhash;
    },
    async sendDepositX(sender, from,gas,gasPrice,x, passwd, nonce) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(from, backendConfig.wethGroupAddr,null,null,null,gas,this.toGweiString(gasPrice),'ETH2WETH', nonce);
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRefundTrans, [passwd], newTrans);
        return txhash;
    },
    async sendEthCancel(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(from, backendConfig.ethGroupAddr,null,null,null,gas,this.toGweiString(gasPrice),'ETH2WETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRevokeTrans, [passwd], newTrans);
        return txhash;
    },
    // getDepositOrigenLockEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.depositOriginLockEvent).toString('hex'), null, null, hashX];
    //     let b = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
    //     return b;
    // },
    // getWithdrawOrigenLockEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.withdrawOriginLockEvent).toString('hex'), null, null, hashX];
    //     let b = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
    //     return b;
    // },
    // getWithdrawCrossLockEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.withdrawCrossLockEvent).toString('hex'), null, null, hashX];
    //     let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
    //     return p;
    // },
    // getDepositCrossLockEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.depositCrossLockEvent).toString('hex'), null, null, hashX];
    //     let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
    //     return p;
    // },
    // getDepositOriginRefundEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.depositOriginRefundEvent).toString('hex'), null, null, hashX];
    //     let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.wanchainHtlcAddr, topics], sender);
    //     return p;
    // },
    // getWithdrawOriginRefundEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.withdrawOriginRefundEvent).toString('hex'), null, null, hashX];
    //     let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
    //     return p;
    // },
    // getDepositethRevokeEvent(sender, hashX) {
    //     let topics = ['0x'+wanUtil.sha3(config.ethRevokeEvent).toString('hex'), null,  hashX];
    //     let p = pu.promisefy(sender.sendMessage, ['getScEvent', config.originalChainHtlc, topics], sender);
    //     return p;
    // },
    getDepositHTLCLeftLockedTime(sender, hashX){
        let p = pu.promisefy(sender.sendMessage, ['callScFunc', config.originalChainHtlc, 'getHTLCLeftLockedTime',[hashX],config.HTLCETHInstAbi], sender);
        return p;
    },
    getWithdrawHTLCLeftLockedTime(sender, hashX){
        let p = pu.promisefy(sender.sendMessage, ['callScFunc', config.wanchainHtlcAddr, 'getHTLCLeftLockedTime',[hashX],config.HTLCWETHInstAbi], sender);
        return p;
    },
    monitorTxConfirm(sender, txhash, waitBlocks) {
        let p = pu.promisefy(sender.sendMessage, ['getTransactionConfirm', txhash, waitBlocks], sender);
        return p;
    },

    getEthBalance(sender, addr) {
        let bs = pu.promisefy(sender.sendMessage, ['getBalance',addr], sender);
        return bs;
    },
    getWanBalance(sender, addr) {
        let bs = pu.promisefy(sender.sendMessage, ['getBalance',addr], sender);
        return bs;
    },
    async sendWanHash(sender, tx) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction(tx.from, backendConfig.wethGroupAddr, tx.value.toString(),tx.to,tx.ethAddr,tx.gas,this.toGweiString(tx.gasPrice.toString()),'WETH2ETH',tx.nonce);
        let txhash =  await pu.promisefy(newTrans.sendLockTrans, [tx.passwd], newTrans);
        return txhash;
    },
    async sendWanX(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction( from, backendConfig.ethGroupAddr,null,null,null,gas,this.toGweiString(gasPrice),'WETH2ETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRefundTrans, [passwd], newTrans);
        return txhash;
    },
    async sendWanCancel(sender, from,gas,gasPrice,x, passwd) {
        let newTrans = wanchainwalletcore.createSender(sender);
        newTrans.createTransaction( from, backendConfig.wethGroupAddr,null,null,null,gas,this.toGweiString(gasPrice),'WETH2ETH');
        newTrans.trans.setKey(x);
        let txhash =  await pu.promisefy(newTrans.sendRevokeTrans, [passwd], newTrans);
        return txhash;
    },

    getMultiEthBalances(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiBalances',addrs], sender);
        return bs;
    },
    getMultiWanBalances(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiBalances',addrs], sender);
        return bs;
    },
    getMultiTokenBalance(sender, addrs) {
        let bs = pu.promisefy(sender.sendMessage, ['getMultiTokenBalance',addrs], sender);
        return bs;
    },
}

Backend.init();
exports.Backend = Backend;
