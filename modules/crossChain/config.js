const config = {};
config.socketUrl = 'ws://192.168.1.58:8080/';
var wanchainNet = 'testnet';
var ethereumNet = '';
config.dataName = wanchainNet;
if(wanchainNet.length)
{
    if(process.platform === 'win32')
    {
        wanchainNet = wanchainNet + '\\';
    }
    else
    {
        wanchainNet = wanchainNet + '/';
    }
}
config.version = '1.0.0';
// web3 parameter
config.host = '// http://localhost'; // http://localhost
config.rpcIpcPath = process.env.HOME;
if (process.platform === 'darwin') {
    config.rpcIpcPath += '/Library/Wanchain/'+wanchainNet+'gwan.ipc';
} else if (process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'sunos') {
    config.rpcIpcPath += '/.wanchain/'+wanchainNet+'gwan.ipc';
} else if (process.platform === 'win32') {
    config.rpcIpcPath = '\\\\.\\pipe\\gwan.ipc';
}
config.keyStorePath = process.env.HOME;
if (process.platform === 'darwin') {
    config.keyStorePath += '/Library/wanchain/'+wanchainNet+'keystore/';
}

if (process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'sunos') {
    config.keyStorePath += '/.wanchain/'+wanchainNet+'keystore/';
}

if (process.platform === 'win32') {
    config.keyStorePath = process.env.APPDATA + '\\wanchain\\'+wanchainNet+'keystore\\';
}
config.ethkeyStorePath = process.env.HOME;
if (process.platform === 'darwin') {
    config.ethkeyStorePath += '/Library/ethereum/'+ethereumNet+'keystore/';
}

if (process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'sunos') {
    config.ethkeyStorePath += '/.ethereum/'+ethereumNet+'keystore/';
}

if (process.platform === 'win32') {
    config.ethkeyStorePath = process.env.APPDATA + '\\ethereum\\'+ethereumNet+'keystore\\';
}

config.host = 'http://52.39.32.90:8545'; // http://localhost
config.port = 8545;
config.OTAMixNumber = 8;
config.StampMixNumber = 3;

config.loglevel = 'debug';
config.listOption = true;
//config.noLogAccount = true;
// console color
config.consoleColor = {
    'COLOR_FgRed': '\x1b[31m',
    'COLOR_FgYellow': '\x1b[33m',
    'COLOR_FgGreen': "\x1b[32m"
};
config.databasePath = __dirname + '/LocalDb';
// config.stampType = {
// 	TypeOne:0,
// 	TypeTwo:1,
// 	TypeFour:2,
// 	TypeEight:3,
// 	TypeSixteen:4
// };
config.wanKeyStorePath = config.keyStorePath;
config.ethKeyStorePath = config.ethkeyStorePath;
require('wanchainwalletcore').start(config);
module.exports = config;
