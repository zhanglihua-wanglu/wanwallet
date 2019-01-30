"use strict";

const _ = require('lodash')
const { app, ipcMain: ipc, shell, webContents } = require('electron')
const { ccUtil, btcUtil } = require('wanchain-js-sdk')

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
        callbackMessage('CrossChain_BTC2WBTC', e, data)
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

      let srcChain = ccUtil.getSrcChainNameByContractAddr("BTC", "BTC");

      let ret = await global.crossInvoker.invokeNormalTrans(srcChain, {
        utxos: utxos,
        to: to,
        value: Number(web3.toBigNumber(amount).mul(100000000)),
        feeRate: config.feeRate,
        password: passwd,
        changeAddress: addressList[0]
      });
      
      if (!ret.code) {
        throw new Error('btc normal tx error')
      }

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
      let wanTokenBalanceObj = [];
      let tokenBalance;
      data.value = {};

      //This method can not use local node, must use remote node.

      wanAddressList = await ccUtil.getWanAccounts()
      wanTokenBalanceObj = await ccUtil.getMultiTokenBalanceByTokenScAddr(wanAddressList,config.wbtcToken.address, 'WAN')

      for (let key in wanTokenBalanceObj) {
        tokenBalance = web3.toBigNumber(wanTokenBalanceObj[key]).div(100000000).toString();
        data.value[key] = tokenBalance;
      }

      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'listStoremanGroups') {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listStoremanGroups>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let smgs = await ccUtil.getBtcSmgList();
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
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>listTransactions>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    try {
      let recordAll = ccUtil.getBtcWanTxHistory({});
      let records = JSON.parse(JSON.stringify(recordAll));
    
      records = records.map((value) => {
        if ((value.chain === 'WAN') && value.crossAddress.startsWith('0x')) {
          value.crossAddress = btcUtil.hash160ToAddress(value.crossAddress, null, settings.btcNetwork);
        }
        if (value.chain === 'BTC' && value.storeman) {
          value.storeman = btcUtil.hash160ToAddress(value.storeman, null, settings.btcNetwork);
        }
        if (value.chain === 'BTC' && value.from === 'local btc account') {
          return _.omit(value, ['HashX'])
        }
        return value;
      });

      records = records.sort((a, b) => {
        return Number(b.time) - Number(a.time);
      });

      data.value = records;

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

      if (!btcScripts.checkPasswd(btcPassword)) {
        throw new Error('wrong btc password')
      }

      log.debug('getAddressList...');
      // 1. construct UTXO for transfer
      console.time('check btc balance');
      //check balance
      let addressList = await btcUtil.getAddressList();
      addressList = await ccUtil.filterBtcAddressByAmount(addressList, amount);
      log.debug('checkBalance...');

      let utxos = await ccUtil.getBtcUtxo(config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, addressList);
      log.info('utxos: ', utxos)

      let result = await ccUtil.getUTXOSBalance(utxos);

      let btcBalance = web3.toBigNumber(result).div(100000000);

      log.debug('current balance:' + btcBalance);

      if (!btcScripts.checkBalance(amount, btcBalance)) {
        throw new Error('Balance is not enough.');
      }

      let input = {
        utxos: utxos,
        smgBtcAddr: btcUtil.addressToHash160(storeman.btcAddress, 'pubkeyhash', settings.btcNetwork),
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

      let addrMap = {};
      for (let i = 0; i < input.utxos.length; i++) {
        let utxo = input.utxos[i];
        // must call this in async func
        if (!addrMap.hasOwnProperty(utxo.address)) {
            let kp = await btcUtil.getECPairsbyAddr(input.password, utxo.address);
            input.keypair.push(kp);
            addrMap[utxo.address] = true;
        }
      }
 
      let srcChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let dstChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'LOCK', input);

      if (!ret.code) {
        throw new Error('lock btc error')
        log.error('lock btc error: ', ret)
      }

      data.value = ret.result
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
      input.x = ccUtil.hexAdd0x(data.parameters.x)
      input.gas = config.wanRefundGas
      input.gasPrice = config.wanGasPrice
      input.password = data.parameters.wanPassword

      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REDEEM', input)

      if (!ret.code) {
        throw new Error('redeem btc fail');
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
      let hashX = ccUtil.hexTrip0x(data.parameters.HashX)
      input.hashX = hashX
      input.feeHard = config.feeHard

      let rec
      let records = await ccUtil.getBtcWanTxHistory();

      for (let i = 0; i < records.length; i++) {
        if (records[i].HashX == hashX) {
            rec = records[i]; 
            break;
        }
      }

      input.keypair = await btcUtil.getECPairsbyAddr(password, rec.from);

      let srcChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let dstChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');

      const ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REVOKE', input);
      if (!ret.code) {
        throw new Error('revoke btc error')
      }

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

      if (!ccUtil.checkWanPassword(wanAddress, password)) {
        throw new Error('wrong password of wan.');
      }
      // Check whether the wbtc balance is enough
      // This method can not use local node, must use remote node.
      // let wanAddressList = await ccUtil.getWanAccountsInfo();
      let wanAddressList = await ccUtil.getWanAccounts()
      let wanTokenBalanceObj = await ccUtil.getMultiTokenBalanceByTokenScAddr(wanAddressList, config.wbtcToken.address, 'WAN')

      let wbtcEnough;
      for (let key in wanTokenBalanceObj) {
        if (key === wanAddress) {
          let wbtcBalance = web3.toBigNumber(wanTokenBalanceObj[key]).div(100000000)
          wbtcEnough = btcScripts.checkBalance(amount, wbtcBalance)
          break
        }
      }

      if (!wbtcEnough) {
        log.error(JSON.stringify(wanAddressList, null, 4));
        log.error(wanAddress)
        throw new Error('The wbtc balance is not enough or addresses provided invalid')
      }

      let input ={}
      input.from = wanAddress
      input.gas = config.wanLockGas
      input.gasPrice = config.wanGasPrice
      input.amount = Number(web3.toBigNumber(amount).mul(100000000)) // in sats
      input.value = ccUtil.calculateLocWanFeeWei(input.amount, global.btc2WanRatio, storeman.txFeeRatio)
      input.crossAddr= btcUtil.addressToHash160(btcAddress, 'pubkeyhash', settings.btcNetwork)
      input.crossAddr = input.crossAddr.startsWith('0x') ? input.crossAddr : '0x' + input.crossAddr
      input.storeman = storeman.wanAddress // storeman is an object
      input.password = password

      const srcChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');
      const dstChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
  
      const ret = await global.crossInvoker.invoke(srcChain, dstChain, 'LOCK', input);

      if (!ret.code) {
        throw new Error('lock wbtc error')
      }
      
      data.value = ret.result;
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    } catch (error) {
      parseError(data, error);
      callbackMessage('CrossChain_BTC2WBTC', e, data);
    }
  } else if (data.action === 'redeemWbtc') {
    try {
      let password = data.parameters.btcPassword;

      if (!btcScripts.checkPasswd(password)) {
        log.error('redeem wbtc wrong password')
        throw new Error('wrong btc password')
      }

      let input = {}
      let hashX = ccUtil.hexTrip0x(data.parameters.HashX)
      input.hashX =  hashX // use hashX to get record
      input.feeHard = config.feeHard;
      
      let rec
      let records = await ccUtil.getBtcWanTxHistory();
      for (let i = 0; i < records.length; i++) {
          if (records[i].HashX === hashX) {
              rec = records[i]; 
              break;
          }
      }

      let addr = btcUtil.hash160ToAddress(rec.crossAddress,'pubkeyhash', settings.btcNetwork);
      let kp = await btcUtil.getECPairsbyAddr(password, addr);

      input.keypair = kp;

      const dstChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC')
      const srcChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN')
      const ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REDEEM', input)

      if (!ret.code) {
        log.error('redeem wbtc error, and the return is: ',  ret)
        throw new Error('redeem wbtc error')
      }

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

      // assemble tx data
      let input = {}
      input.hashX = ccUtil.hexTrip0x(data.parameters.HashX)
      input.gas = config.wanRevokeGas
      input.gasPrice = config.wanGasPrice
      input.password = password

      let dstChain = ccUtil.getSrcChainNameByContractAddr('BTC','BTC');
      let srcChain = ccUtil.getSrcChainNameByContractAddr('WAN','WAN');

      // invoke tx sender
      let ret = await global.crossInvoker.invoke(srcChain, dstChain, 'REVOKE', input)
      if (!ret.code) {
        throw new Error('revoke wbtc error')
      }

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
    let args = data.parameters;
    args.push(function (err, result) {
      data.error = err;
      data.value = result;
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