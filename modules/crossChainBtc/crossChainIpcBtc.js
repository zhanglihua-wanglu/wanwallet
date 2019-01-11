"use strict";

const { app, ipcMain: ipc, shell, webContents } = require('electron')
const { walletCore, ccUtil, btcUtil } = require('wanchain-js-sdk')

const config = require('./config.js');
const log = config.getLogger('crossChain-BTC');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const Windows = require('../windows.js');
let btcScripts = require('./btcScripts');
const bitcoin = require('bitcoinjs-lib');
const settings = require('../settings.js');
const path = require('path');
var bs58check = require('bs58check');

// reserve for merge
ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
  log.info('CrossChain_BTC2WBTC->Message Received!->' + data.action);
  if (data.action === 'createBtcAddress') {
    try {
      log.debug('CrossChain_BTC2WBTC->>>>>>>>>createBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let newAddress = await btcUtil.createBTCAddress(data.parameters);
      await ccUtil.btcImportAddress(newAddress.address);
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
      await btcUtil.getAddressList().then((addressList) => {
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

      let utxos = await ccUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);

      data.value = web3.toBigNumber(result).div(100000000).toString();

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
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
      let utxos = await ccUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
      let result = await ccUtil.getUTXOSBalance(utxos);

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
      addressList = await btcUtil.getAddressList();
      let addr = JSON.stringify(addressList, null, 2)
      
      addressList = await ccUtil.filterBtcAddressByAmount(addressList, amount);
      let addr2 = JSON.stringify(addressList, null, 2)

      utxos = await ccUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);
      let utxosStr = JSON.stringify(utxos, null, 2)
      let result = await ccUtil.getUTXOSBalance(utxos);

      btcBalance = web3.toBigNumber(result).div(100000000);
      
      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance not enough.');
      }

      //Check password
      // let keyPairArray = [];
      // for (let i = 0; i < addressList.length; i++) {
      //   let kp = await btcUtil.getECPairsbyAddr(passwd, addressList[i]);
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

      let srcChain = ccUtil.getSrcChainNameByContractAddr("BTC", "BTC");

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
      wanAddressList = await ccUtil.getWanAccountsInfo()

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
      let smgs = await ccUtil.getBtcSmgList();
      console.log('\n\n\n\n storeman group list: ', JSON.stringify(smgs), '\n\n\n\n\n')
      if (smgs.length > 0) {
        smgs.forEach((smg)=>{
          if (smg.btcAddress.startsWith('0x')) {
            smg.btcAddress = btcUtil.hash160ToAddress(smg.btcAddress, 'pubkeyhash', settings.btcNetwork);
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
      let recordAll = ccUtil.getBtcWanTxHistory({});
      let records = JSON.parse(JSON.stringify(recordAll));
      
      console.log("\n\n\n\nRECORDS: ", records, "n\n\n\n")

      records = records.map((value) => {
        if ((value.chain === 'WAN') && value.crossAddress.startsWith('0x')) {
          value.crossAddress = btcUtil.hash160ToAddress(value.crossAddress, null, settings.btcNetwork);
        }
        if (value.chain === 'BTC' && value.storeman) {
          value.storeman = btcUtil.hash160ToAddress(value.storeman, null, settings.btcNetwork);
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
      let addressList = await btcUtil.getAddressList();
      console.log('\n\n\naddress list 1: ', addressList, '\n\n\n')
      addressList = await ccUtil.filterBtcAddressByAmount(addressList, amount);
      console.log('\n\n\naddress list 2: ', addressList, '\n\n\n')
      log.debug('checkBalance...');

      let utxos = await ccUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);

      let result = await ccUtil.getUTXOSBalance(utxos);

      let btcBalance = web3.toBigNumber(result).div(100000000);

      log.debug('current balance:' + btcBalance);

      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance is not enough.');
      }

      console.log('\n\n\n storeman: ', JSON.stringify(storeman), '\n\n\n')

      let input = {
        utxos: utxos,
        smgBtcAddr: btcUtil.addressToHash160(storeman.btcAddress, 'pubkeyhash', settings.btcNetwork),
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
            let kp = await btcUtil.getECPairsbyAddr(input.password, utxo.address);
            input.keypair.push(kp);
            addrMap[utxo.address] = true;
        }
      }

      console.log("key pair array length", input.keypair.length);
 
      let srcChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      console.log(JSON.stringify(srcChain, null, 4));
      let dstChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
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
      let srcChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let dstChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
      // assemble input data
      let input = {}
      input.x = (data.parameters.x.startsWith('0x') ? data.parameters.x : '0x' + data.parameters.x)
      input.gas = 2e6
      input.gasPrice = 180e9
      input.password = data.parameters.wanPassword

      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REDEEM', input)

      if (!ret.result) {
        throw new Error('redeemBtc failed.');
      }

      data.value = ret.result

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeBtc') {
    try {

      let password = data.parameters.btcPassword
      let input = {}

      input.hashX = data.parameters.HashX
      input.feeHard = config.feeHard

      let rec
      let records = await ccUtil.getBtcWanTxHistory();

      for (let i=0; i<records.length; i++) {
        if (records[i].crossAddress != '') {
            rec = records[i]; 
            break;
        }
      }

      input.keypair = await btcUtil.getECPairsbyAddr(password, rec.from);

      let srcChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let dstChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');

      console.log("Source chain: ", JSON.stringify(srcChain, null, 4));
      console.log("Destination chain: ", JSON.stringify(dstChain, null, 4));

      // let alice = await btcUtil.getECPairsbyAddr(btcPassword, from);

      // if (alice.length === 0) {
      //   throw new Error('Password of btc is wrong!');
      // }

      const ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REVOKE', input);

      log.info('revokeBtc finish, txhash:' + ret.result);
      data.value = ret.result;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'lockWbtc') {
    try {
      let password = data.parameters.wanPassword;
      let storeman = data.parameters.storeman;
      let wanAddress = data.parameters.wanAddress;
      let btcAddress = data.parameters.btcAddress;
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
      let wanAddressList = await ccUtil.getWanAccountsInfo();

      let wbtcEnough;
      wanAddressList.forEach(function (wanAddr) {
        if (wanAddress === wanAddr.address) {
          let wbtcBalance = web3.toBigNumber(wanAddr.tokenBalance).div(100000000);
          wbtcEnough = btcScripts.checkBalance(amount, wbtcBalance);
          // log.info(`amount:${Number(amount)}, wbtcBalance:${Number(wbtcBalance.toString())}`);
          console.log(`amount:${Number(amount)}, wbtcBalance:${Number(wbtcBalance.toString())}`);
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

      let input ={}
      input.from = wanAddress
      input.gas = config.gasLimit
      input.gasPrice = config.gasPrice
      input.amount = Number(web3.toBigNumber(amount).mul(100000000));
      input.value = ccUtil.calculateLocWanFee(input.amount, global.btc2WanRatio, storeman.txFeeRatio);
      input.crossAddress = btcUtil.addressToHash160(btcAddress, 'pubkeyhash', settings.btcNetwork)
      input.storeman = storeman
      input.password = password
      //Make the wdTx


      console.log("btc2WanRatio=", global.btc2WanRatio);
      console.log("Input:", JSON.stringify(input, null, 4));

      let srcChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
      let dstChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');

      console.log("Source chain: ", JSON.stringify(srcChain, null, 4));
      console.log("Destination chain: ", JSON.stringify(dstChain, null, 4));
  
      const ret = await global.crossInvoker.invoke(srcChain, dstChain, 'LOCK', input);

      data.value = ret.result;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemWbtc') {
    try {
      let password = data.parameters.btcPassword;

      let input = {}
      input.hashX =  data.parameters.HashX; // use hashX to get record
      input.feeHard = config.feeHard;
      
      let rec
      let records = await ccUtil.getBtcWanTxHistory();
      for (let i = 0; i < records.length; i++) {
          if (records[i].crossAddress != '') {
              rec = records[i]; 
              break;
          }
      }

      console.log("Alice:", JSON.stringify(rec, null, 4));
      let kp = await btcUtil.getECPairsbyAddr(password, rec.from);
      console.log("Alice:", alice);

      input.keypair = alice;

      let dstChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let srcChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
      console.log("Source chain: ", JSON.stringify(srcChain, null, 4));
      console.log("Destination chain: ", JSON.stringify(dstChain, null, 4));

      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REDEEM', input);
      
      data.value = ret.result;

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'revokeWbtc') {
    try {

      let from = data.parameters.from
      let password = data.parameters.wanPassword

      if (!ccUtil.checkWanPassword(from, password)) {
        throw new Error('wrong password of wan.');
      }

      let input = {}

      // assemble tx data
      input.hashX = data.parameters.HashX.startsWith('0x') ? data.parameters.HashX : '0x' + data.parameters.HashX
      input.gas = config.gasLimit
      input.gasPrice = config.gasPrice
      input.password = password

      // invoke tx sender
      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REVOKE', input)

      data.value = ret.result;
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
      let result = global.btc2WanRatio
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

  // for refactoring
  let wanchainCore = new walletCore(config)
  await wanchainCore.init(config)
}

exports.init = init;

