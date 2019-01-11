require('./ccETH')
require('./ccERC20')
require('./ccBTC')
const { walletCore } = require('wanchain-js-sdk')
const config = require('./config')

let ccBackend = new walletCore(config)

exports.ccBackend = ccBackend
exports.init = async () => {
    await ccBackend.init()
}