require('./ccETH')
require('./ccERC20')
require('./ccBTC')
const { walletCore } = require('wanchain-js-sdk')
const config = require('./config')

// sdk singleton 
const ccBackend = new walletCore(config)

exports.init = async () => {
    await ccBackend.init()
}