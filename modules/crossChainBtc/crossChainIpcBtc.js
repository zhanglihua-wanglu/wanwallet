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
let btcUtil;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
  log.debug('CrossChain_BTC2WBTC->>>>>>>>Message Received!');
  let sendServer = (data.chainType === 'BTC') ? wanchainCore.btcSend : wanchainCore.wanSend;

  if (sendServer.socket.connection.readyState != 1) {
    try {
      await wanchainCore.reinit(config);
    } catch (error) {
      log.error("Failed to connect to apiserver:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  }

  if (data.action === 'createBtcAddress') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>createBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      btcUtil.createAddress(data.parameters).then((newAddress) => {
        data.value = newAddress;
        callbackMessage('CrossChain_BTC2WBTC', e, data);
      });
    } catch (error) {
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  }
  else if (data.action === 'listBtcAddress') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>listBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      btcUtil.getAddressList().then((addressList) => {
        addressList.forEach(function (Array, index) {
          log.debug(config.consoleColor.COLOR_FgYellow, (index + 1) + ': ' + Array.address, '\x1b[0m');
        });
        data.value = addressList;
        callbackMessage('CrossChain_BTC2WBTC', e, data);
      });
    } catch (error) {
      log.error("Failed to listBtcAddress:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'getBtcBalance') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>getBtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let addressList = await btcUtil.getAddressList();
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

      let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);

      let print = 'btcBalance: ' + web3.toBigNumber(result).div(100000000).toString();

      log.debug(print);

      data.value = web3.toBigNumber(result).div(100000000).toString();

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to getBtcBalance:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'getBtcMultiBalances') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>getBtcMultiBalances>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let addressList = await btcUtil.getAddressList();


      if (addressList.length === 0) {
        log.debug('address list lenght === 0');

        data.value = null;

        callbackMessage('CrossChain_BTC2WBTC', e, data);
        return;
      }

      data.value = {};
      data.value.address = [];
      data.value.balance = "";

      for (let i = 0; i < addressList.length; i++) {
        data.value.address.push(addressList[i].address)
      }

      let array = [];
      for (let i = 0; i < addressList.length; i++) {
        array.push(addressList[i].address)
      }

      let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);

      let print = 'btcBalance: ' + web3.toBigNumber(result).div(100000000).toString();

      data.value.balance = web3.toBigNumber(result).div(100000000).toString();

      log.debug('getBtcMultiBalances finish, data:');
      log.debug(JSON.stringify(data, null, 4));

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to getBtcBalance:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'sendBtcToAddress') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      if (!data.parameters) {
        throw new Error('parameters is null.');
      }

      if (!data.parameters.amount || !data.parameters.toAddress || !data.parameters.password) {
        throw new Error('parameters error.');
      }

      let amount = Number(data.parameters.amount);
      let to = data.parameters.toAddress;
      let passwd = data.parameters.password;

      if (!btcScripts.checkBalance(amount, null) ||
        !to.length > 0 ||
        !btcScripts.checkPasswd(passwd)) {

        throw new Error('parameters infomation error.');
      }

      let btcBalance = 0;
      let addressList;
      let utxos;
      // btc balance
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>GetBalance');
      addressList = await btcUtil.getAddressList();
      let array = [];
      for (let i = 0; i < addressList.length; i++) {
        array.push(addressList[i].address)
      }

      utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);

      let result = await ccUtil.getUTXOSBalance(utxos);

      btcBalance = web3.toBigNumber(result).div(100000000);

      if (!btcScripts.checkBalance(amount, btcBalance)) {

        throw new Error('Balance not enough.')
      }

      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>GetBalance:' + result);

      let keyPairArray = [];

      keyPairArray = await btcUtil.getECPairs(passwd);

      if (keyPairArray.length === 0) {
        throw new Error('Password is wrong!');
      }

      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>getECPairs success!');

      let target = {
        address: to,
        value: web3.toBigNumber(amount).mul(100000000)
      };

      const { rawTx, fee } = await ccUtil.btcBuildTransaction(utxos, keyPairArray, target, config.feeRate);
      if (!rawTx) {
        throw new Error('btcBuildTransaction error.');
      }

      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>btcBuildTransaction success!');

      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>sendRawTransaction rawTx:' + rawTx);

      let result2 = await ccUtil.sendRawTransaction(ccUtil.btcSender, rawTx);
      log.debug('hash: ', result2);
      data.value = 'success';

      log.debug('CrossChain_BTC2WBTC->>>>>>>>>sendBtcToAddress>>>>>>>>>>>sendRawTransaction success!');
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to sendBtcToAddress:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'listWbtcBalance') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listWbtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let wanAddressList = [];
      let wethBalance;
      data.value = {};

      wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);
      log.debug(sprintf("%20s %58s", "WAN address", "WBTC balance"));

      wanAddressList.forEach(function (wanAddress, index) {
        wethBalance = web3.toBigNumber(wanAddress.wethBalance).div(100000000);
        data.value[wanAddress.address] = wethBalance;
      });
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to listWbtcBalance:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'listStoremanGroups') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listStoremanGroups>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let smgs = await ccUtil.getBtcSmgList(ccUtil.btcSender);
      data.value = smgs;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to listStoremanGroups:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'listTransactions') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let records = ccUtil.getBtcWanTxHistory({});

      records = records.filter((value) => {
        retrun(value.crossAdress !== '');
      });

      data.value = records;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to listTransactions:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (data.action === 'lockBtc') {
    try {
      if (!data.parameters) {
        throw new Error('parameters can not be null');
      }

      if (!data.parameters.storeman) {
        throw new Error('parameters.storeman can not be null');
      }

      if (!data.parameters.wanAddress) {
        throw new Error('parameters.wanAddress can not be null');
      }

      if (!data.parameters.amount) {
        throw new Error('parameters.amount can not be null');
      }

      if (!data.parameters.wanPassword) {
        throw new Error('parameters.wanPassword can not be null');
      }

      if (!data.parameters.btcPassword) {
        throw new Error('parameters.btcPassword can not be null');
      }

      let storeman = data.parameters.storeman;
      let wanAddress = data.parameters.wanAddress;
      let amount = data.parameters.amount;
      let wanPassword = data.parameters.wanPassword;
      let btcPassword = data.parameters.btcPassword;

      //check passwd
      let keyPairArray;
      try {
        keyPairArray = await btcUtil.getECPairs(btcPassword);
        if (keyPairArray.length === 0) {
          throw new Error('Password Error');
        }
      } catch (err) {
        throw new Error("lockBtc getECPairs error.");
      }

      //check balance
      let addressList = await btcUtil.getAddressList();

      let aliceAddr = [];
      for (let i = 0; i < addressList.length; i++) {
        aliceAddr.push(addressList[i].address)
      }

      let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, 0, 1000, aliceAddr);
      let result = await ccUtil.getUTXOSBalance(utxos);

      let btcBalance = web3.toBigNumber(result).div(100000000);

      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance is not enough.');
      }

      let value = Number(web3.toBigNumber(amount).mul(100000000));

      let record = await ccUtil.fund(keyPairArray, storeman.ethAddress, value);

      // notice wan.
      const tx = {};
      tx.storeman = storeman.wanAddress;
      tx.from = wanAddress;
      tx.userH160 = '0x' + bitcoin.crypto.hash160(keyPairArray[0].publicKey).toString('hex');
      tx.hashx = '0x' + record.hashx;
      tx.txHash = '0x' + record.txhash;
      tx.lockedTimestamp = record.redeemLockTimeStamp;
      tx.gas = config.gasLimit;
      tx.gasPrice = config.gasPrice;
      tx.passwd = wanPassword;

      let txHash;
      try {
        txHash = await ccUtil.sendWanNotice(ccUtil.wanSender, tx);

        log.info("sendWanNotice txHash:", txHash);
      } catch (e) {
        throw new Error("get sendWanNotice error: " + e.message);
      }

      data.value = 'txHash';

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to lockBtc:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  }
  else if (sendServer.hasMessage(data.action)) {
    // console.log('sendServer :', data);
    let args = data.parameters;
    // console.log(args);
    args.push(function (err, result) {
      data.error = err;
      data.value = result;
      // console.log(err,result);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    });
    sendServer.sendMessage(data.action, ...args);
  }
});

function callbackMessage(message, e, data) {
  const windowId = e.sender.id;
  const senderWindow = Windows.getById(windowId);
  senderWindow.send('Callback_' + message, data);
}

async function init() {
  wanchainCore = new WanchainCoreBTC(config);
  ccUtil = wanchainCore.be;
  btcUtil = wanchainCore.btcUtil;
  await wanchainCore.init(config);
}
exports.init = init;

