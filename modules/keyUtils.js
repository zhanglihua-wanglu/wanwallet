'use strict';
//some operate utils for key store.

const fs = require('fs');
const path = require('path');
const ethereumNode = require('./ethereumNode.js');
const keythereum = require("keythereum");
const logger = require('./utils/logger');


const log = logger.create('keyUtils');

// addr has no '0x' already.
function getKsfullnamebyAddr(addr){
    let addrl = addr.toLowerCase();
    let keystorePath = ethereumNode.getDatadir(true);
    let files = fs.readdirSync(keystorePath);
    let i=0;
    for(i =0; i<files.length; i++){
        if(files[i].toLowerCase().indexOf(addrl) != -1){
            break;
        }
    }
    if( i == files.length ){
        return "";
    }
    return path.join(keystorePath, files[i]);
}

function checkWanPassword(address, keyPassword) {

    if(address.indexOf('0x') == 0){
        address = address.slice(2);
    }
    address = address.toLowerCase();

    let filepath = getKsfullnamebyAddr(address);

    log.info("keystore path:",filepath);

    if(!filepath){
        log.info("Faild to find address: ", address);
        return false;
    }

    let keystoreStr = fs.readFileSync(filepath,"utf8");
    let keystore = JSON.parse(keystoreStr);

    let keyBObj = {version:keystore.version, crypto:keystore.crypto2};

    try {
        keythereum.recover(keyPassword, keyBObj);
        return true;
    } catch (error) {
        log.warn('wrong password.');
        return false;
    }
}

module.exports = {
    getKsfullnamebyAddr,
    checkWanPassword
}