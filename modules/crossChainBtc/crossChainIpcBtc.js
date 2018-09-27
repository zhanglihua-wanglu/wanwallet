"use strict";
const config = require('./config.js');
const log = config.getLogger('crossChain-BTC');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCoreBTC = require('wanchain-crosschain-btc');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const Windows = require('../windows.js');
let btcScripts = require('./btcScripts');
const bitcoin = require('bitcoinjs-lib');
const settings = require('../settings.js');
const path = require('path');
var bs58check = require('bs58check');

let wanchainCore;
let be;
let ccUtil;
let btcUtil;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
  log.info('CrossChain_BTC2WBTC->Message Received!->' + data.action);
  //log.info('parameters:' + JSON.stringify(data.parameters, null, 4));
  let sendServer = (data.chainType === 'BTC') ? wanchainCore.btcSend : wanchainCore.wanSend;

  if (sendServer.socket.connection.readyState != 1) {
    try {
      await wanchainCore.reinit(config);
    } catch (error) {
      log.error("Failed to connect to apiserver. please check the network.", error.toString());
      //log.error(error.stack);
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  }

  let wanSender;
  if (config.useLocalNode) {
    wanSender = ccUtil.web3Sender;
  } else {
    wanSender = ccUtil.wanSender;
  }

  if (data.action === 'createBtcAddress') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>createBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      //log.debug(JSON.stringify(data, null, 4));
      let newAddress = await btcUtil.createAddress(data.parameters);
      log.debug('newAddress:', newAddress);
      await ccUtil.btcImportAddress(ccUtil.btcSender, newAddress.address);
      data.value = newAddress.address;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  } else if (data.action === 'getWbtcToken') {
    data.value = config.wbtcToken;
    callbackMessage('CrossChain_BTC2WBTC', e, data);
  } else if (data.action === 'listBtcAddress') {
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
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcBalance') {
    try {
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

      data.value = web3.toBigNumber(result).div(100000000).toString();

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcMultiBalances') {
    try {
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
        data.value.address.push(addressList[i].address);
      }
      let array = [];
      for (let i = 0; i < addressList.length; i++) {
        array.push(addressList[i].address);
      }
      let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);

      data.value.balance = web3.toBigNumber(result).div(100000000).toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'sendBtcToAddress') {
    try {
      let amount = Number(data.parameters.amount);
      let to = data.parameters.toAddress;
      let passwd = data.parameters.password;

      try {
        bs58check.decode(to);
      } catch (error) {
        throw new Error('BTC address is invalid.');
      }

      if (!btcScripts.checkBalance(amount, null) ||
        !to.length > 0 ||
        !btcScripts.checkPasswd(passwd)) {

        throw new Error('parameters infomation error.');
      }

      let btcBalance = 0;
      let addressList;
      let utxos;
      // Check whether the btc balance is enough.
      addressList = await btcUtil.getAddressList();
      let array = [];
      for (let i = 0; i < addressList.length; i++) {
        array.push(addressList[i].address);
      }

      utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);
      btcBalance = web3.toBigNumber(result).div(100000000);

      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance not enough.');
      }

      //Check password
      let keyPairArray = [];
      keyPairArray = await btcUtil.getECPairs(passwd);
      if (keyPairArray.length === 0) {
        throw new Error('Password is wrong!');
      }

      //Build transaction
      let target = {
        address: to,
        value: web3.toBigNumber(amount).mul(100000000)
      };

      const { rawTx, fee } = await ccUtil.btcBuildTransaction(utxos, keyPairArray, target, config.feeRate);
      if (!rawTx) {
        throw new Error('btcBuildTransaction error.');
      }

      //Send transaction
      let result2 = await ccUtil.sendRawTransaction(ccUtil.btcSender, rawTx);
      log.debug('hash: ', result2);

      let txInfo = {
        from: "local btc account",
        to: target.address,
        value: target.value,
        txHash: result2,
        crossType: 'BTC2WAN'
      };

      ccUtil.saveNormalBtcTransactionInfo(txInfo);

      data.value = 'success';

      log.debug('CrossChain_BTC2WBTC->sendBtcToAddress->sendRawTransaction success!');
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listWbtcBalance') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listWbtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let wanAddressList = [];
      let wethBalance;
      data.value = {};

      //This method can not use local node, must use remote node.
      wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);

      wanAddressList.forEach(function (wanAddress, index) {
        wethBalance = web3.toBigNumber(wanAddress.wethBalance).div(100000000).toString();
        data.value[wanAddress.address] = wethBalance;
      });
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listStoremanGroups') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listStoremanGroups>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let smgs = await ccUtil.getBtcSmgList(ccUtil.btcSender);
      data.value = smgs;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listTransactions') {
    console.log('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let records = ccUtil.getBtcWanTxHistory({});

      records = records.map((value) => {
        //console.log(value);
        //console.log(settings.network);
        if ((value.chain === 'WAN') && value.crossAddress.startsWith('0x')) {
          value.crossAddress = btcUtil.hash160ToAddress(value.crossAddress, null, settings.network);
        }
        return value;
      });

      records = records.sort((a, b) => {
        return Number(b.time) - Number(a.time);
      });

      // log.debug(JSON.stringify(records, null, 4));
      data.value = records;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'lockBtc') {
    try {

      //log.debug('data.parameters:' + JSON.stringify(data.parameters, null, 2));
      let storeman = data.parameters.storeman;
      let wanAddress = data.parameters.wanAddress;
      let amount = data.parameters.amount;
      let wanPassword = data.parameters.wanPassword;
      let btcPassword = data.parameters.btcPassword;

      log.debug('getECPairs...');
      //check passwd
      console.time('getECPairs');
      let keyPairArray = await btcUtil.getECPairs(btcPassword);
      console.timeEnd('getECPairs');
      if (keyPairArray.length === 0) {
        throw new Error('wrong password of btc.');
      }

      console.time('checkWanPassword');
      if(!ccUtil.checkWanPassword(wanAddress, wanPassword)) {
        throw new Error('wrong password of wan.');
      }
      console.timeEnd('checkWanPassword');

      log.debug('getAddressList...');

      console.time('check btc balance');
      //check balance
      let addressList = await btcUtil.getAddressList();

      let aliceAddr = [];
      for (let i = 0; i < addressList.length; i++) {
        aliceAddr.push(addressList[i].address)
      }

      log.debug('checkBalance...');

      let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, aliceAddr);
      let result = await ccUtil.getUTXOSBalance(utxos);
      let btcBalance = web3.toBigNumber(result).div(100000000);

      log.debug('current balance:' + btcBalance);
      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance is not enough.');
      }

      console.timeEnd('check btc balance');

      console.time('fund');
      log.debug('fund...');
      let value = Number(web3.toBigNumber(amount).mul(100000000));
      let record = await ccUtil.fund(keyPairArray, storeman.ethAddress, value);

      console.timeEnd('fund');

      console.time('sendWanNotice');
      log.debug('sendWanNotice...');
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

      //log.info('notice wan tx:' + JSON.stringify(tx, null, 4));
      let txHash = await ccUtil.sendWanNotice(wanSender, tx);
      log.info("sendWanNotice txHash:", txHash);

      console.timeEnd('sendWanNotice');
      data.value = 'txHash';

      log.info('notice wan finish. txHash:' + data.value);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemBtc') {
    try {
      let crossAddress = data.parameters.crossAddress.startsWith('0x') ? data.parameters.crossAddress : '0x' + data.parameters.crossAddress;
      let x = (data.parameters.x.startsWith('0x') ? data.parameters.x : '0x' + data.parameters.x);
      let wanPassword = data.parameters.wanPassword;

      let redeemHash = await ccUtil.sendDepositX(wanSender, crossAddress,
        config.gasLimit, config.gasPrice, x, wanPassword);

      if (!redeemHash) {
        throw new Error('redeemBtc failed.');
      }

      data.value = redeemHash;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error("Failed to redeemBtc:", error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeBtc') {
    try {
      let HashX = data.parameters.HashX;
      let from = data.parameters.from;
      let btcPassword = data.parameters.btcPassword;

      let alice = await btcUtil.getECPairsbyAddr(btcPassword, from);

      if (alice.length === 0) {
        throw new Error('Password of btc is wrong!');
      }

      let txhash = await ccUtil.revokeWithHashX(HashX, alice);

      log.info('revokeBtc finish, txhash:' + txhash);
      data.value = txhash;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'lockWbtc') {
    try {
      let storeman = data.parameters.storeman;
      let wanAddress = data.parameters.wanAddress;
      let btcAddress = data.parameters.btcAddress;
      let wanPassword = data.parameters.wanPassword;
      let amount = data.parameters.amount;

      try {
        bs58check.decode(btcAddress);
      } catch (error) {
        throw new Error('BTC address is invalid.');
      }

      if(!ccUtil.checkWanPassword(wanAddress, wanPassword)) {
        throw new Error('wrong password of wan.');
      }
      //Check whether the wbtc balance is enought.
      //This method can not use local node, must use remote node.
      let wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);

      let wbtcEnough;
      wanAddressList.forEach(function (wanAddr) {
        if (wanAddress === wanAddr.address) {
          let wbtcBalance = web3.toBigNumber(wanAddr.wethBalance).div(100000000);
          wbtcEnough = btcScripts.checkBalance(amount, wbtcBalance);
          log.info(`amount:${Number(amount)}, wbtcBalance:${Number(wbtcBalance.toString())}`);
        }
      });

      if (wbtcEnough === false) {
        log.error(JSON.stringify(wanAddressList, null, 4));
        log.error(wanAddress);
        throw new Error('The wbtc balance is not enough.');
      }

      if (wbtcEnough === undefined) {
        throw new Error('The wan address is invalid. input:' + wanAddress + ', list: ' + JSON.stringify(wanAddressList, null, 4));
      }

      //Make the wdTx
      let wdTx = {};
      wdTx.gas = config.gasLimit;
      wdTx.gasPrice = config.gasPrice;
      wdTx.passwd = wanPassword;
      let btcAddr = btcAddress;
      wdTx.cross = '0x' + btcUtil.addressToHash160(btcAddr, 'pubkeyhash', settings.network);
      wdTx.from = wanAddress;
      wdTx.amount = Number(web3.toBigNumber(amount).mul(100000000));
      wdTx.storemanGroup = storeman.wanAddress;
      wdTx.value = ccUtil.calculateLocWanFee(wdTx.amount, ccUtil.c2wRatio, storeman.txFeeRatio);
      let x = btcUtil.generatePrivateKey().slice(2);
      wdTx.x = x;

      log.debug('Ready to send wdTx...');

      let wdHash = await ccUtil.sendWanHash(wanSender, wdTx);
      data.value = wdHash;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemWbtc') {
    try {
      let crossAddress = data.parameters.crossAddress;
      let HashX = data.parameters.HashX;
      let btcPassword = data.parameters.btcPassword;

      let aliceAddr
      if (crossAddress.startsWith('0x')) {
        aliceAddr = btcUtil.hash160ToAddress(crossAddress, 'pubkeyhash', settings.network);
      } else {
        aliceAddr = crossAddress;
      }

      let alice = await btcUtil.getECPairsbyAddr(btcPassword, aliceAddr);

      if (alice.length === 0) {
        throw new Error('Password of btc is wrong!');
      }

      let walletRedeem = await ccUtil.redeemWithHashX(HashX, alice);
      log.debug('redeemWbtc walletRedeem: ', walletRedeem);

      data.value = walletRedeem;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeWbtc') {
    try {
      let from = data.parameters.from;
      let HashX = data.parameters.HashX.startsWith('0x') ? data.parameters.HashX : '0x' + data.parameters.HashX;
      let wanPassword = data.parameters.wanPassword;

      if(!ccUtil.checkWanPassword(from, wanPassword)) {
        throw new Error('wrong password of wan.');
      }

      let revokeWbtcHash = await ccUtil.sendWanCancel(wanSender, from,
        config.gasLimit, config.gasPrice, HashX, wanPassword);

      data.value = revokeWbtcHash;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.toString());
        log.error(error.stack);
        data.error = error.toString();
      } else {
        log.error(error);
        data.error = error;
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (sendServer.hasMessage(data.action)) {
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
  log.info(config.socketUrl);

  config.crossDbname = path.join(config.databasePath, config.crossDbname);
  config.btcWallet = path.join(config.databasePath, config.btcWallet);
  log.info(config.crossDbname);
  log.info(config.btcWallet);

  wanchainCore = new WanchainCoreBTC(config);
  ccUtil = wanchainCore.be;

  btcUtil = wanchainCore.btcUtil;
  await wanchainCore.init();

  log.info('crossChainIpcBtc->sdk->useLocalNode:' + ccUtil.config.useLocalNode);
}
exports.init = init;

