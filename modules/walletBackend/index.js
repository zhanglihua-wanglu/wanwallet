require('./ccETH')
require('./ccERC20')
require('./ccBTC')
const { walletCore, ccUtil } = require('wanchain-js-sdk')
const config = require('./config')
const _ = require('lodash')

// sdk singleton 
const ccBackend = new walletCore(config)

// pending cross chain transaction counter
const pendingCrossChainTxCounter = () => { 
    let crossCollectionEE = global.wanDb.getItemAll(config.crossCollection, {});
    let crossCollectionBtc = ccUtil.getBtcWanTxHistory({})

    _.remove(crossCollectionEE, (rec) => {
        return rec.status === 'Redeemed' || rec.status === 'Revoked'
    })

    _.remove(crossCollectionBtc, (rec) => {
        return rec.status === 'redeemFinished' || rec.status === 'revokeFinished' || rec.status === 'Success'
    })

    return crossCollectionEE.length + crossCollectionBtc.length
} 

exports.init = async () => { await ccBackend.init() }
exports.ccPendingCounter = pendingCrossChainTxCounter

