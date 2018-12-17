# Wanwallet Browser

The Wanwallet browser is the tool of choice to browse and use Ðapps.

Please note that this repository is the Electron host for the Meteor based wallet dapp whose repository is located here: https://github.com/wanchain/meteor-dapp-wallet.

## Help and troubleshooting

Please check the [Wanwallet troubleshooting guide](https://github.com/wanchain/wanwallet).


## Installation

If you want to install the app from a pre-built version on the [release page](https://github.com/wanchain/wanwallet/releases),
you can simply run the executeable after download.

For updating simply download the new version and copy it over the old one (keep a backup of the old one if you want to be sure).

#### Config folder
The data folder for wallet is stored in other places:

- Windows `%APPDATA%\wallet`
- macOS `~/Library/Application\ Support/
- Linux `~/.config/wallet`


## Development

For development, a Meteor server will need to be started to assist with live reload and CSS injection.
Once a wallet version is released the Meteor frontend part is bundled using the `meteor-build-client` npm package to create pure static files.

### Dependencies

To run wallet in development you need:

- [Node.js](https://nodejs.org) `v7.x` (use the prefered installation method for your OS)
- [Meteor](https://www.meteor.com/install) javascript app framework
- [Yarn](https://yarnpkg.com/) package manager
- [Electron](http://electron.atom.io/) `v1.7.9` cross platform desktop app framework
- [Gulp](http://gulpjs.com/) build and automation system

Install the latter ones via:

    $ curl https://install.meteor.com/ | sh
    $ curl -o- -L https://yarnpkg.com/install.sh | bash
    $ yarn global add electron@1.7.9
    $ yarn global add gulp

### Initialisation

Now you're ready to initialise wanwallet for development:

    $ git clone https://github.com/wanchain/wanwallet.git
    $ cd wanwallet
    $ yarn

To update wanwallet in the future, run:

    $ cd wanwallet
    $ git pull
    $ yarn

### Run Wanwallet

For development we start the interface with a Meteor server for autoreload etc.
*Start the interface in a separate terminal window:*

    $ cd wanwallet/interface && meteor --no-release-check

In the original window you can then start wanwallet with:

    $ cd wanwallet
    $ yarn dev:electron

*NOTE: client-binaries (e.g. [gwan](https://github.com/wanchain/go-wanchain)) specified in [clientBinaries.json](https://github.com/wanchain/wanwallet/blob/master/clientBinaries.json) will be checked during every startup and downloaded if out-of-date, binaries are stored in the [config folder](#config-folder)*

*NOTE: use `--help` to display available options, e.g. `--loglevel debug` (or `trace`) for verbose output*

### Run the Wallet

Start the wallet app for development, *in a separate terminal window:*

    $ cd wanwallet/interface && meteor --no-release-check

    // and in another terminal

    $ cd my/path/meteor-dapp-wallet/app && meteor --port 3050

In the original window you can then start wanwallet using wallet mode:

    $ cd wanwallet
    $ yarn dev:electron --mode wallet


### Deployment

Our build system relies on [gulp](http://gulpjs.com/) and [electron-builder](https://github.com/electron-userland/electron-builder/).

#### Dependencies

[meteor-build-client](https://github.com/frozeman/meteor-build-client) bundles the [meteor](https://www.meteor.com/)-based interface. Install it via:

    $ npm install -g meteor-build-client

Furthermore cross-platform builds require additional [`electron-builder` dependencies](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build#linux). On macOS those are:

    // windows deps
    $ brew install wine --without-x11 mono makensis

    // linux deps
    $ brew install gnu-tar libicns graphicsmagick xz

#### Generate packages

To generate the binaries for wanwallet run:

    $ gulp

To generate the Wanchain Wallet (this will pack the one Ðapp from https://github.com/wanchain/meteor-dapp-wallet):

    $ gulp --wallet

The generated binaries will be under `dist_mist/release` or `dist_wallet/release`.


#### Options

##### platform

To build binaries for specific platforms (default: all available) use the following flags:

    // on mac
    $ gulp --win --linux --mac

    // on linux
    $ gulp --win --linux

    // on win
    $ gulp --win

##### walletSource

With the `walletSource` you can specify the Wallet branch to use, default is `master`:

    $ gulp --wallet --walletSource develop


Options are:

- `master`
- `develop`
- `local` Will try to build the wallet from [wallet/]../meteor-dapp-wallet/app

*Note: applicable only when combined with `--wallet`*

#### skipTasks

When building a binary, you can optionally skip some tasks — generally for testing purposes.

  $ gulp --mac --skipTasks=bundling-interface,release-dist

#### Checksums

Spits out the MD5 checksums of distributables.

It expects installer/zip files to be in the generated folders e.g. `dist_wallet/release`

    $ gulp checksums [--wallet]



*Note: Integration tests are not yet supported on Windows.*
