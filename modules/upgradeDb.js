// const settings=require('../settings.js');
const Loki = require('lokijs');
const Q = require('bluebird');
let fs = require('fs');
let Web3 = require('web3');
let web3 = new Web3();
const ethconfig = require('./crossChain/config');

// oldVersion
// let oldVersion = '2.1.0';
let upgradeDb = {};
let log;
upgradeDb.initLog = function (_log){
    log = _log;
};

let fsExits = true;
upgradeDb.upgradeDb_2_1 = function (appPath) {

    let ethCrossChainDb;

    new Q((resolve, reject) => {
        let crossChainDbFile = `${appPath}/crossTransDb`;

        if (!fs.existsSync(crossChainDbFile)) {
            fsExits = false;
            resolve();
            return;
        }

        ethCrossChainDb = new Loki(crossChainDbFile, {
            env: 'NODEJS',
            autosave: true,
            autosaveInterval: 5000,
            autoload: true,
            autoloadCallback(err) {
                if (err) {
                    log.error(err);
                    reject(new Error('Error instantiating db'));
                }
                resolve();
            }
        });
    }).then(() => {
        if (!fsExits) {
            return;
        }
        log.info("upgrade db...");
        let collection = ethCrossChainDb.getCollection("crossTransaction");

        let results = collection.find();

        for (let data of results) {

            if (data.HashX) {

                let _data = {};

                _data.hashX = data.HashX;
                _data.x = data.x;
                _data.from = data.from;
                _data.to = data.crossAdress;
                _data.storeman = data.storeman;

                // let value
                _data.value = 0;
                _data.contractValue = data.txValue;

                _data.lockedTime = data.time ? parseInt(data.time / 1000) : "";
                _data.buddyLockedTime = "";

                _data.srcChainAddr = data.chain === 'WAN' ? 'WAN' : 'ETH';
                _data.dstChainAddr = data.to;

                _data.srcChainType = data.chain === 'WAN' ? 'WAN' : 'ETH';
                _data.dstChainType = data.chain === 'WAN' ? 'ETH' : 'WAN';

                _data.status = transitionState(data.status);

                _data.approveTxHash = "";

                _data.lockTxHash = data.lockTxHash;
                _data.redeemTxHash = data.refundTxHash;
                _data.revokeTxHash = data.revokeTxHash;

                _data.buddyLockTxHash = data.crossLockHash;
                _data.tokenSymbol = 'ETH';
                _data.tokenStand = 'ETH';
                _data.htlcTimeOut = data.HTLCtime ? parseInt(data.HTLCtime / 1000) : "";
                _data.buddyLockedTimeOut = data.suspendTime ? parseInt(data.suspendTime / 1000) : "";

                log.debug("cross_data:", _data);
                global.wanDb.insertItem(ethconfig.crossCollection, _data);

                collection.remove(data);
            } else {

                let _data = {};
                _data.txhash = data.txhash;
                _data.from = data.from;
                _data.to = data.to;
                _data.value = web3.toWei(data.value);
                _data.sentTime = data.time ? parseInt(data.time / 1000) : "";
                _data.chainAddr = 'ETH';
                _data.chainType = 'ETH';
                _data.tokenSymbol = 'ETH';
                _data.status = "Success";

                log.debug("normal_data:", _data);
                global.wanDb.insertItem(ethconfig.normalCollection, _data);

                collection.remove(data);

            }

        }
        log.info("upgrade db success.");

        let crossChainDbFile = `${appPath}/crossTransDb`;
        fs.unlink(crossChainDbFile, function (error) {
            if (error) {
                console.log(error);
                return false;
            }
            log.info('remove old version db file.');
        });
    });

};

function transitionState(status) {
    switch (status){
        case 'sentHashPending': return 'LockSending'; // hash. online...
        case 'sentHashConfirming': return 'LockSent'; // hash  online success.  confirming...
        case 'sentHashFailed': return 'LockSendFail'; // hash  online failed

        case 'waitingCross': return 'Locked'; // hash  online confirm block success.   waiting storeman confirm.

        case 'waitingCrossConfirming': return 'BuddyLocked'; // storeman confirm. waiting block confirm.
        case 'waitingX': return 'BuddyLocked';// block confirm ok.

        case 'sentXPending': return 'RedeemSending';
        case 'sentXConfirming': return 'RedeemSent';
        case 'refundFinished': return 'Redeemed';

        case 'suspending': return 'BuddyLocked';

        case 'waitingRevoke': return 'BuddyLocked';
        case 'sentRevokePending': return 'RevokeSending';
        case 'sentRevokeConfirming': return 'RevokeSent';
        case 'revokeFinished': return 'Revoked';

        default: return 'Failed';
    }
}

module.exports = upgradeDb;
