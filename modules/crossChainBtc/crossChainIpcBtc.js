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

let wanchainCore;
let be;
let ccUtil;
let btcUtil;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
  log.debug('CrossChain_BTC2WBTC->Message Received!->' + data.action);
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

  let wanSender;
  if(config.useLocalNode) {
    wanSender = ccUtil.getSenderbyChain('web3');
  } else {
    wanSender = ccUtil.getSenderbyChain('WAN');
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
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  } else if(data.action === 'getWbtcToken'){
      data.value = config.wbtcToken;
      callbackMessage('CrossChain_BTC2WBTC',e,data);
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
      log.error("Failed to listBtcAddress:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcBalance') {
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
  } else if (data.action === 'getBtcMultiBalances') {
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
        data.value.address.push(addressList[i].address);
      }

      let array = [];
      for (let i = 0; i < addressList.length; i++) {
        array.push(addressList[i].address);
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
  } else if (data.action === 'sendBtcToAddress') {
    try {
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
      data.value = 'success';

      log.debug('CrossChain_BTC2WBTC->sendBtcToAddress->sendRawTransaction success!');
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to sendBtcToAddress:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listWbtcBalance') {
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
  } else if (data.action === 'listStoremanGroups') {
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
  } else if (data.action === 'listTransactions') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let records = ccUtil.getBtcWanTxHistory({});

      records = records.filter((value) => {
        return (value.crossAdress !== '');
      });

      log.debug(JSON.stringify(records, null, 4));
      data.value = records;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to listTransactions:", error.toString());
      data.error = error.toString();
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
      let keyPairArray;
      try {
        keyPairArray = await btcUtil.getECPairs(btcPassword);
        if (keyPairArray.length === 0) {
          throw new Error('Password Error');
        }
      } catch (err) {
        throw new Error("lockBtc getECPairs error.");
      }

      log.debug('getAddressList...');

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

      log.debug('fund...');
      let value = Number(web3.toBigNumber(amount).mul(100000000));
      let record = await ccUtil.fund(keyPairArray, storeman.ethAddress, value);

      log.debug('sendWanNotice...');
      // notice wan.
      const tx = {};
      tx.storeman = storeman.wanAddress;
      tx.from = wanAddress;
      tx.userH160 = '0x' + bitcoin.crypto.hash160(keyPairArray[0].publicKey).toString('hex');
      tx.hashx = '0x'+record.hashx;
      tx.txHash = '0x'+record.txhash;
      tx.lockedTimestamp = record.redeemLockTimeStamp;
      tx.gas = config.gasLimit;
      tx.gasPrice = config.gasPrice;
      tx.passwd = wanPassword;

      log.info('notice wan tx:' + JSON.stringify(tx, null, 4));
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
  } else if (data.action === 'redeemBtc') {
    try {
      let crossAddress = data.parameters.crossAddress.startsWith('0x') ? data.parameters.crossAddress : '0x' + data.parameters.crossAddress;
      let x = (data.parameters.x.startsWith('0x') ? data.parameters.x : '0x' + data.parameters.x);
      let wanPassword = data.parameters.wanPassword;

      let redeemHash = await ccUtil.sendDepositX(ccUtil.wanSender, crossAddress,
        config.gasLimit, config.gasPrice, x, wanPassword);

      if (!redeemHash) {
        throw new Error('redeemBtc failed.');
      }

      data.value = redeemHash;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to redeemBtc:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeBtc') {
    try {
      let HashX = data.parameters.HashX;
      let from = data.parameters.from;
      let btcPassword = data.parameters.btcPassword;

      let alice = await btcUtil.getECPairsbyAddr(btcPassword, from);
      await ccUtil.revokeWithHashX(HashX, alice);

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to revokeBtc:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'lockWbtc') {
    try {
      let storeman = data.parameters.storeman;
      let wanAddress = data.parameters.wanAddress;
      let btcAddress = data.parameters.btcAddress;
      let wanPassword = data.parameters.wanPassword;
      let amount = data.parameters.amount;

      //Check whether the wbtc balance is enought.
      wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);

      let wbtcEnough;
      wanAddressList.forEach(function (wanAddr) {
        if (wanAddress === wanAddr.address) {
          let wbtcBalance = web3.toBigNumber(wanAddress.wethBalance).div(100000000);
          wbtcEnough = btcScripts.checkBalance(amount, wbtcBalance);
        }
      });

      if (wbtcEnough === false) {
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

      let wdHash = await ccUtil.sendWanHash(ccUtil.wanSender, wdTx);
      data.value = wdHash;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to lockWbtc:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemWbtc') {
    try {
      let crossAddress = data.parameters.crossAddress;
      let HashX = data.parameters.HashX;
      let btcPassword = data.parameters.btcPassword;

      let aliceAddr = btcUtil.hash160ToAddress(crossAddress, 'pubkeyhash', settings.network);
      let alice = await btcUtil.getECPairsbyAddr(btcPassword, aliceAddr);
      let walletRedeem = await ccUtil.redeemWithHashX(HashX, alice);
      log.debug('redeemWbtc walletRedeem: ', walletRedeem);

      data.value = walletRedeem;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to redeemWbtc:", error.toString());
      data.error = error.toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeWbtc') {
    try {
      let from = data.parameters.from;
      let HashX = data.parameters.HashX.startsWith('0x') ? data.parameters.HashX : '0x' + data.parameters.HashX;
      let wanPassword = data.parameters.wanPassword;

      let revokeWbtcHash = await ccUtil.sendWanCancel(ccUtil.wanSender, from,
        config.gasLimit, config.gasPrice, HashX, wanPassword);

      data.value = revokeWbtcHash;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      log.error("Failed to revokeWbtc:", error.toString());
      data.error = error.toString();
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
  wanchainCore = new WanchainCoreBTC(config);
  ccUtil = wanchainCore.be;

  btcUtil = wanchainCore.btcUtil;
  await wanchainCore.init();

  log.debug('crossChainIpcBtc->sdk->useLocalNode:' + ccUtil.config.useLocalNode);
}
exports.init = init;

