const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const packageJson = require('../package.json');
const _ = require('./utils/underscore');
const lodash = require('lodash');


// try loading in config file
const defaultConfig = {
    mode: 'wallet',
    production: false,
};
try {
    _.extend(defaultConfig, require('../config.json'));
} catch (err) {
}

const argv = require('yargs')
    .usage('Usage: $0 [Mist options] [Node options]')
    .option({
        mode: {
            alias: 'm',
            demand: false,
            default: defaultConfig.mode,
            describe: 'App UI mode: wallet, mist.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        node: {
            demand: false,
            default: null,
            describe: 'Node to use: geth, eth',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        network: {
            demand: false,
            default: null, //'main',
            describe: 'Network to connect to: main, testnet',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        rpc: {
            demand: false,
            describe: 'Path to node IPC socket file OR HTTP RPC hostport (if IPC socket file then --node-ipcpath will be set with this value).',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        swarmurl: {
            demand: false,
            default: 'http://localhost:8500',
            describe: 'URL serving the Swarm HTTP API. If null, Mist will open a local node.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        gethpath: {
            demand: false,
            describe: 'Path to Geth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        ethpath: {
            demand: false,
            describe: 'Path to Eth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        'ignore-gpu-blacklist': {
            demand: false,
            describe: 'Ignores GPU blacklist (needed for some Linux installations).',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',
        },
        'reset-tabs': {
            demand: false,
            describe: 'Reset Mist tabs to their default settings.',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',
        },
        internal: {
            demand: false,
            describe: 'internal dev mode',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Mist options:',
        },
        logfile: {
            demand: false,
            describe: 'Logs will be written to this file in addition to the console.',
            default: `${app.getPath('userData')}/log/mist.log`,
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        loglevel: {
            demand: false,
            default: 'info',
            describe: 'Minimum logging threshold: info, debug, error, trace (shows all logs, including possible passwords over IPC!).',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        syncmode: {
            demand: false,
            default: 'fast',
            requiresArg: true,
            describe: 'Geth synchronization mode: [fast|light|full]',
            nargs: 1,
            type: 'string',
            group: 'Mist options:',
        },
        version: {
            alias: 'v',
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Display Mist version.',
            group: 'Mist options:',
            type: 'boolean',
        },
        skiptimesynccheck: {
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Disable checks for the presence of automatic time sync on your OS.',
            group: 'Mist options:',
            type: 'boolean',
        },
        '': {
            describe: 'To pass options to the underlying node (e.g. Geth) use the --node- prefix, e.g. --node-datadir',
            group: 'Node options:',
        },
    })
    .help('h')
    .alias('h', 'help')
    .parse(process.argv.slice(1));

argv.nodeOptions = [];

function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    }

    if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
    }

    return false;
}
for (const optIdx in argv) {
    if (optIdx.indexOf('node-') === 0) {
        argv.nodeOptions.push(`--${optIdx.substr(5)}`);

        if (argv[optIdx] !== true) {
            argv.nodeOptions.push(argv[optIdx]);
        }
    }
}

// some options are shared
if (argv.ipcpath) {
    argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}

if (argv.nodeOptions && argv.nodeOptions.syncmode) {
    argv.push('--syncmode', argv.nodeOptions.syncmode);
}

class Settings {
    init() {
    mkdirsSync(this.getKeystoreDir('ethereum'));
    mkdirsSync(this.getKeystoreDir('wanchain'));
       logger.setup(argv);

        this._log = logger.create('Settings');
    }

    get userDataPath() {
    // Application Aupport/Mist
        return app.getPath('userData');
    }
    // get crossDbPath() {
    //     let dbFileName = 'corssdb.lokidb';
    //     if(this.network === 'testnet'){
    //         dbFileName = 'corssdb.testnet.lokidb';
    //     }
    //     return path.join(this.userDataPath, dbFileName);
    // }
    get dbFilePath() {
        //let dbFileName = (this.inAutoTestMode) ? 'mist.test.lokidb' : 'mist.lokidb';
        let dbFileName = 'mist.lokidb';
        if(this.network === 'pluto'){
            dbFileName = 'mist.pluto.lokidb';
        }else if(this.network === 'testnet'){
            dbFileName = 'mist.testnet.lokidb';
        }
        return path.join(this.userDataPath, dbFileName);

    }
    get appDataPath() {
        // Application Support/
        for(var i=0;i<argv.nodeOptions.length;i++)
        {
            if(argv.nodeOptions[i] == '--datadir')
            {
                if(i+1<argv.nodeOptions.length)
                {
                    return argv.nodeOptions[i+1];
                }
            }
        }
        // return app.getPath('appData')+'\\'+'wanchain';
        return path.join(app.getPath('appData'), 'wanchain');
    }
    getAppDataPath(chain) {
        // Application Support/
        for(var i=0;i<argv.nodeOptions.length;i++)
        {
            if(argv.nodeOptions[i] == '--datadir')
            {
                if(i+1<argv.nodeOptions.length)
                {
                    let cfgDataDir =  argv.nodeOptions[i+1];  // there is a hardcode wanchain.
                    if(chain == 'wanchain'){
                        return cfgDataDir;
                    }else {
                        let dir = path.dirname(cfgDataDir);
                        return path.join(dir, chain);
                    }

                }
            }
        }
        return path.join(app.getPath('appData'), chain);
    }
    getKeystoreDir(chain){ //wanchain  /  ethereum
        let keystorePath = this.userHomePath;

        if (process.platform === 'darwin') {
            if( chain === 'wanchain' ) {
                keystorePath += '/Library/' + 'Wanchain';
            } else {
                keystorePath += '/Library/' + chain;
            }
        }

        if (process.platform === 'freebsd' ||
            process.platform === 'linux' ||
            process.platform === 'sunos') keystorePath += '/.' + chain;

        if (process.platform === 'win32') keystorePath = this.getAppDataPath(chain);


        if(this.network == 'testnet'){
            keystorePath =  path.join(keystorePath, 'testnet');
        }
        keystorePath =  path.join(keystorePath, 'keystore');
        // console.log("keystorePath is ", keystorePath);
        return  keystorePath;
    }

    get userHomePath() {
        return app.getPath('home');
    }

    get cli() {
        return argv;
    }

    get appVersion() {
        return packageJson.version;
    }

    get checkAppVersion() {
        // 'http://47.104.60.142/wanwalletVersion.json'
        let result = {
            appVersion: 'https://raw.githubusercontent.com/wanchain/wanwallet/wanchain3.0_beta/wanwalletVersion.json', 
            gwanVersion: 'https://raw.githubusercontent.com/wanchain/wanwallet/wanchain3.0_beta/clientBinaries.json'
        };
        
        return result;
    }

    get appName() {
        return this.uiMode === 'mist' ? 'Mist' : 'Wanchain Wallet';
    }

    get appLicense() {
        return packageJson.license;
    }

    get uiMode() {
        return (_.isString(argv.mode)) ? argv.mode.toLowerCase() : argv.mode;
    }

    get inProductionMode() {
        return defaultConfig.production;
    }
    get internal() {
		return (argv.internal || defaultConfig.internal) ? true : false;
    }
    get inAutoTestMode() {
        return !!process.env.TEST_MODE;
    }

    get swarmURL() {
        return argv.swarmurl;
    }

    get gethPath() {
        return argv.gethpath;
    }

    get ethPath() {
        return argv.ethpath;
    }

    get rpcMode() {
        if (argv.rpc && argv.rpc.indexOf('http') === 0)
            return 'http';
        if (argv.rpc && argv.rpc.indexOf('ws:') === 0) {
            this._log.warn('Websockets are not yet supported by Mist, using default IPC connection');
            argv.rpc = null;
            return 'ipc';
        } else
            return 'ipc';
    }

    get rpcConnectConfig() {
        if (this.rpcMode === 'ipc') {
            return {
                path: this.rpcIpcPath,
            };
        }

        return {
            hostPort: this.rpcHttpPath,
        };
    }

    get rpcHttpPath() {
        return (this.rpcMode === 'http') ? argv.rpc : null;
    }

    get rpcIpcPath() {
        let ipcPath = (this.rpcMode === 'ipc') ? argv.rpc : null;

        if (ipcPath) {
            return ipcPath;
        }

        ipcPath = this.userHomePath;

        // let network = this.network;

        // if (process.platform === 'win32') {
        //     network = network + '\\';
        // }
        // else {
        //     network = network + '/';
        // }

        // if (process.platform === 'darwin') {
        //     ipcPath += '/Library/Wanchain/'+network+'gwan.ipc';
        // } else if (process.platform === 'freebsd' ||
        //     process.platform === 'linux' ||
        //     process.platform === 'sunos') {
        //     ipcPath += '/.wanchain/'+network+'gwan.ipc';
        // } else if (process.platform === 'win32') {
        //     ipcPath = '\\\\.\\pipe\\gwan.ipc';
        // }

        if (process.platform === 'darwin') {
            ipcPath += '/Library/Wanchain/' + 'gwan.ipc';
        } else if (process.platform === 'freebsd' ||
            process.platform === 'linux' ||
            process.platform === 'sunos') {
            ipcPath += '/.wanchain/' + 'gwan.ipc';
        } else if (process.platform === 'win32') {
            ipcPath = '\\\\.\\pipe\\gwan.ipc';
        }

        this._log.debug(`IPC path: ${ipcPath}`);

        return ipcPath;
    }

    get nodeType() {
        return argv.node ? argv.node : "gwan";
    }

    get network() {
        if(argv.network){
            return argv.network;
        }else{
            return this.loadUserData('network') || 'main';
        }
    }
    get btcNetwork() {
        let net = this.network;
        if (net === 'main') {
            net = 'mainnet';
        }
        return net;
    }
    get syncmode() {
        return argv.syncmode;
    }

    get nodeOptions() {
        return argv.nodeOptions;
    }
    get loglevel() {
        return argv.loglevel;
    }

    get language() {
        return this.loadConfig('ui.i18n');
    }

    set language(langCode) {
        this.saveConfig('ui.i18n', langCode);
    }

    get skiptimesynccheck() {
        return argv.skiptimesynccheck;
    }

    initConfig() {
        global.sysconfig.insert({
            ui: {
                i18n: i18n.getBestMatchedLangCode('en') // app.getLocale()
            }
        });
    }

    saveConfig(key, value) {
        let obj = global.sysconfig.get(1);

        if (!obj) {
            this.initConfig();
            obj = global.sysconfig.get(1);
        }

        if (lodash.get(obj, key) !== value) {
            lodash.set(obj, key, value);
            global.sysconfig.update(obj);

            this._log.debug(`Settings: saveConfig('${key}', '${value}')`);
            this._log.trace(global.sysconfig.data);
        }
    }

    loadConfig(key) {
        const obj = global.sysconfig.get(1);

        if (!obj) {
            this.initConfig();
            return this.loadConfig(key);
        }

        this._log.trace(`Settings: loadConfig('${key}') = '${lodash.get(obj, key)}'`);

        return lodash.get(obj, key);
    }

    loadUserData(path2) {
        const fullPath = this.constructUserDataPath(path2);

        if(this._log) {this._log.trace('Load user data', fullPath);}

      // check if the file exists
        try {
            fs.accessSync(fullPath, fs.R_OK);
        } catch (err) {
            return null;
        }

      // try to read it
        try {
            const data = fs.readFileSync(fullPath, { encoding: 'utf8' });
            if(this._log) {this._log.debug(`Reading "${data}" from ${fullPath}`);}
            return data;
        } catch (err) {
            if(this._log) {this._log.warn(`File not readable: ${fullPath}`, err);}
        }

        return null;
    }


    saveUserData(path2, data) {
        if (!data) return; // return so we dont write null, or other invalid data

        const fullPath = this.constructUserDataPath(path2);

        try {
            this._log.debug(`Saving "${data}" to ${fullPath}`);
            fs.writeFileSync(fullPath, data, { encoding: 'utf8' });
        } catch (err) {
            this._log.warn(`Unable to write to ${fullPath}`, err);
        }
    }


    constructUserDataPath(filePath) {
        return path.join(this.userDataPath, filePath);
    }

}

module.exports = new Settings();
