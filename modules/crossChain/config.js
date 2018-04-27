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
config.ethLockGas = 230000; //171866;
config.ethRefundGas = 120000;  // 91663;
config.ethRevokeGas = 60000; // 40323;

config.wanLockGas = 300000; // 232665;
config.wanRefundGas = 60000; // 34881;
config.wanRevokeGas = 80000; // 49917;

config.originalChainHtlc = "0x6623c049b4cdc76f315c2ced3e4fa288b86ab780";
config.wanchainHtlcAddr = "0xe8c4834d02e5a717fdfa7374ac4e7edb2f2e6b19";

config.crossDbname = 'crossTransDb';
config.crossCollection = 'crossTransaction';

module.exports = config;
