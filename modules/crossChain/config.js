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

config.loglevel = 'debug';

config.databasePath = __dirname + '/LocalDb';

config.wanKeyStorePath = config.keyStorePath;
config.ethKeyStorePath = config.ethkeyStorePath;

config.ethGasPrice = 123;
config.wanGasPrice = 123;
config.ethLockGas = 171866;
config.ethRefundGas = 39829;
config.ethRevokeGas = 40323;
config.wanLockGas = 150070;
config.wanRefundGas = 39937;
config.wanRevokeGas = 40017;

config.originalChainHtlc = "0x17bcc853907a6eda7e3d0f5baa833700eb3c6a22";
config.wanchainHtlcAddr = "0x00b56ac040d2e8df1f99c456fd5caa6623cda5b2";

config.crossDbname = 'crossTransDb';
config.crossCollection = 'crossTransaction';

module.exports = config;
