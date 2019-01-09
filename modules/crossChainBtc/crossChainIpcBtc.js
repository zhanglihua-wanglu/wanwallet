"use strict";
const config = require('./config.js');
const log = config.getLogger('crossChain-BTC');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCoreBTC = require('wanchain-crosschainbtc');
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

// reserve for merge

let WanchainCore = require('wanchain-js-sdk').walletCore;
let CCUtil = require('wanchain-js-sdk').ccUtil;
let BTCUtil = require('wanchain-js-sdk').btcUtil

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
      let newAddress = await BTCUtil.createBTCAddress(data.parameters);
      await CCUtil.btcImportAddress(newAddress.address);
      data.value = newAddress.address;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
      return;
    }
  } else if (data.action === 'getWbtcToken') {
    data.value = config.wbtcToken;
    callbackMessage('CrossChain_BTC2WBTC', e, data);
  } else if (data.action === 'listBtcAddress') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>listBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      await BTCUtil.getAddressList().then((addressList) => {
        addressList.forEach(function (Array, index) {
          log.debug(config.consoleColor.COLOR_FgYellow, (index + 1) + ': ' + Array.address, '\x1b[0m');
        });
        data.value = addressList;
        callbackMessage('CrossChain_BTC2WBTC', e, data);
      });
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcBalance') {
    try {
      let addressList = await BTCUtil.getAddressList();
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

      let utxos = await CCUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await CCUtil.getUTXOSBalance(utxos);

      data.value = web3.toBigNumber(result).div(100000000).toString();

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcMultiBalances') {
    try {
      let addressList = await BTCUtil.getAddressList();
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
      let utxos = await CCUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await CCUtil.getUTXOSBalance(utxos);

      data.value.balance = web3.toBigNumber(result).div(100000000).toString();
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
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
      // addressList = await btcUtil.getAddressList();
      // addressList = await btcUtil.getAddressList();
      addressList = await BTCUtil.getAddressList();
      let addr = JSON.stringify(addressList, null, 2)
      
      // addressList = await ccUtil.filterBtcAddressByAmount(addressList, amount);
      addressList = await CCUtil.filterBtcAddressByAmount(addressList, amount);
      let addr2 = JSON.stringify(addressList, null, 2)

      // utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);
      utxos = await CCUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);
      let utxosStr = JSON.stringify(utxos, null, 2)
      let result = await CCUtil.getUTXOSBalance(utxos);

      btcBalance = web3.toBigNumber(result).div(100000000);
      
      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance not enough.');
      }

      //Check password
      // let keyPairArray = [];
      // for (let i = 0; i < addressList.length; i++) {
      //   let kp = await BTCUtil.getECPairsbyAddr(passwd, addressList[i]);
      //   keyPairArray.push(kp);
      // }

      // if (keyPairArray.length === 0) {
      //   throw new Error('Password is wrong!');
      // }
      // if (keyPairArray[0].compressed === undefined) {
      //   throw new Error('Password is wrong!');
      // }

      // //Build transaction
      // let target = {
      //   address: to,
      //   value: Number(web3.toBigNumber(amount).mul(100000000))
      // };

      let input = {
        utxos: utxos,
        to: to,
        value: amount,
        feeRate: config.feeRate,
        password: passwd,
        changeAddress: addressList[0]
      }

      let srcChain = CCUtil.getSrcChainNameByContractAddr("BTC", "BTC");

      let ret = await global.crossInvoker.invokeNormalTrans(srcChain, input);

      console.log('\n\n\n\n\ntx hash:', ret, '\n\n\n\n\n\n')
      
      data.value = 'success';

      log.debug('CrossChain_BTC2WBTC->sendBtcToAddress->sendRawTransaction success!');
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listWbtcBalance') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listWbtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let wanAddressList = [];
      let tokenBalance;
      data.value = {};

      //This method can not use local node, must use remote node.
      wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);

      wanAddressList.forEach(function (wanAddress, index) {
        tokenBalance = web3.toBigNumber(wanAddress.tokenBalance).div(100000000).toString();
        data.value[wanAddress.address] = tokenBalance;
      });
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listStoremanGroups') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listStoremanGroups>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let smgs = await CCUtil.getBtcSmgList();
      console.log('\n\n\n\n storeman group list: ', JSON.stringify(smgs), '\n\n\n\n\n')
      if (smgs.length > 0) {
        smgs.forEach((smg)=>{
          if (smg.btcAddress.startsWith('0x')) {
            smg.btcAddress = BTCUtil.hash160ToAddress(smg.btcAddress, 'pubkeyhash', settings.btcNetwork);
          }
        });
      }

      data.value = smgs;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listTransactions') {
    console.log('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let recordAll = CCUtil.getBtcWanTxHistory({});
      let records = JSON.parse(JSON.stringify(recordAll));
      
      console.log("\n\n\n\nRECORDS: ", records, "n\n\n\n")

      records = records.map((value) => {
        if ((value.chain === 'WAN') && value.crossAddress.startsWith('0x')) {
          value.crossAddress = BTCUtil.hash160ToAddress(value.crossAddress, null, settings.btcNetwork);
        }
        if (value.chain === 'BTC' && value.storeman) {
          value.storeman = BTCUtil.hash160ToAddress(value.storeman, null, settings.btcNetwork);
        }
        return value;
      });

      records = records.sort((a, b) => {
        return Number(b.time) - Number(a.time);
      });

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
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

      log.debug('getAddressList...');
      // 1. construct UTXO for transfer
      console.time('check btc balance');
      //check balance
      let addressList = await BTCUtil.getAddressList();
      console.log('\n\n\naddress list 1: ', addressList, '\n\n\n')
      addressList = await CCUtil.filterBtcAddressByAmount(addressList, amount);
      console.log('\n\n\naddress list 2: ', addressList, '\n\n\n')
      log.debug('checkBalance...');

      let utxos = await CCUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);

      let result = await CCUtil.getUTXOSBalance(utxos);

      let btcBalance = web3.toBigNumber(result).div(100000000);

      log.debug('current balance:' + btcBalance);

      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance is not enough.');
      }

      console.log('\n\n\n storeman: ', JSON.stringify(storeman), '\n\n\n')

      const input = {
        utxos: utxos,
        smgBtcAddr: BTCUtil.addressToHash160(storeman.btcAddress, 'pubkeyhash', settings.btcNetwork),
        // smgBtcAddr: storeman.btcAddress,
        // value: amount,
        value: Number(web3.toBigNumber(amount).mul(100000000)),
        feeRate: config.feeRate,
        password: btcPassword,
        changeAddress: addressList[0],
        keypair: [],
        storeman: storeman['wanAddress'],
        wanAddress: wanAddress,
        gas: 2e6,
        gasPrice: 180e9,
      }

      console.log('\n input: ', JSON.stringify(input), '\n')

      let addrMap = {};
      for (let i = 0; i < input.utxos.length; i++) {
        let utxo = input.utxos[i];
        // must call this in async func
        if (!addrMap.hasOwnProperty(utxo.address)) {
            console.log("Get key pair for: %d:%s ",i, utxo.address);
            let kp = await BTCUtil.getECPairsbyAddr(input.password, utxo.address);
            input.keypair.push(kp);
            addrMap[utxo.address] = true;
        }
      }

      console.log("key pair array length", input.keypair.length);

      
      let srcChain = CCUtil.getSrcChainNameByContractAddr('BTC','BTC');
      console.log(JSON.stringify(srcChain, null, 4));
      let dstChain = CCUtil.getSrcChainNameByContractAddr('WAN','WAN');
      console.log(JSON.stringify(dstChain, null, 4));

      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'LOCK', input);
      console.log('\n\n\n\n\n ret: ', ret.result, '\n\n\n\n\n');

      log.info('notice wan finish. txHash:' + data.value);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
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
      parseError(data, error);
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
      parseError(data, error);
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

      if (!ccUtil.checkWanPassword(wanAddress, wanPassword)) {
        throw new Error('wrong password of wan.');
      }
      //Check whether the wbtc balance is enought.
      //This method can not use local node, must use remote node.
      let wanAddressList = await ccUtil.getWanAccountsInfo(ccUtil.wanSender);

      let wbtcEnough;
      wanAddressList.forEach(function (wanAddr) {
        if (wanAddress === wanAddr.address) {
          let wbtcBalance = web3.toBigNumber(wanAddr.tokenBalance).div(100000000);
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
      wdTx.cross = '0x' + btcUtil.addressToHash160(btcAddr, 'pubkeyhash', settings.btcNetwork);
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
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemWbtc') {
    try {
      let crossAddress = data.parameters.crossAddress;
      let HashX = data.parameters.HashX;
      let btcPassword = data.parameters.btcPassword;

      let aliceAddr
      if (crossAddress.startsWith('0x')) {
        aliceAddr = btcUtil.hash160ToAddress(crossAddress, 'pubkeyhash', settings.btcNetwork);
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
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeWbtc') {
    try {
      let from = data.parameters.from;
      let HashX = data.parameters.HashX.startsWith('0x') ? data.parameters.HashX : '0x' + data.parameters.HashX;
      let wanPassword = data.parameters.wanPassword;

      if (!ccUtil.checkWanPassword(from, wanPassword)) {
        throw new Error('wrong password of wan.');
      }

      let revokeWbtcHash = await ccUtil.sendWanCancel(wanSender, from,
        config.gasLimit, config.gasPrice, HashX, wanPassword);

      data.value = revokeWbtcHash;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getBtcFeeRate') {
    try {
      data.value = config.feeRate;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'checkBtcAddress') {
    try {
      let address = data.parameters.address;
      try {
        bs58check.decode(address);
        data.value = 'success';
      } catch (error) {
        data.error = 'BTC address is invalid.';
        log.error(data.error);
      }
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'getCoin2WanRatio') {
    try {
      let address = data.parameters.address;
      let result = await ccUtil.getBtcC2wRatio(ccUtil.btcSender);
      log.info(result);
      data.value = {};
      data.value.c2wRatio = result;
      data.value.status = 'success';
      log.info(data);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
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

function parseError(data, error) {
  if (error instanceof Error) {
    log.error(error.toString());
    log.error(error.stack);
    data.error = error.toString();
  } else {
    log.error(error);
    data.error = error;
  }
}

function callbackMessage(message, e, data) {
  const windowId = e.sender.id;
  const senderWindow = Windows.getById(windowId);
  senderWindow.send('Callback_' + message, data);
}

async function init() {
  log.info(config.socketUrl);

  config.crossDbname = path.join(config.databasePathPrex, config.crossDbname);
  config.btcWallet = path.join(config.databasePathPrex, config.btcWallet);
  log.info('crossDbname: ', config.crossDbname);
  log.info(config.btcWallet);

  wanchainCore = new WanchainCoreBTC(config);
  ccUtil = wanchainCore.be;

  btcUtil = wanchainCore.btcUtil;
  await wanchainCore.init();

  log.info('crossChainIpcBtc->sdk->useLocalNode:' + ccUtil.config.useLocalNode);

  // for refactoring
  let WanchainCoreInst = new WanchainCore(config)
  await WanchainCoreInst.init(config)
}
exports.init = init;

