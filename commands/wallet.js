const { Command } = require('commander');
const wallet = new Command('wallet')
.description('Wallet functions to manage ckBTC');
const chalk = require('chalk')
const conf = require('conf')
const bip39 = require('bip39')
const inquirer = require('inquirer');
const {Principal} = require('@dfinity/principal');
const config = new conf();
const { getSubaccountFromPrincipal, createIcpApi, mnemonicToId, VOLT_CID, CKBTC_CID, VOLTIDL, CKBTCIDL}= require('../utility/icp.js');
const { logSpinner, stopSpinner, startSpinner}= require('../utility/spinner.js');

const framesLoading = ['-', '\\', '|', '/'];
wallet
.command('create')
.description('Create a new wallet')
.action(async () => {
  if (config.has('wallet')) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.red.bold('A wallet already exists - do you want to continue? THIS WILL DELETE THE EXISTING WALLET'),
        default: false
      }
    ]);

    if (!answers.continue) {
      return process.exit(0);
    }

    config.delete('wallet');
  }
  let mnemonic = bip39.generateMnemonic();
  let identity = mnemonicToId(mnemonic);
  config.set('wallet', {
    mnemonic: mnemonic,
    address: identity.getPrincipal().toText()
  });
  console.log(
    chalk.green('Wallet created with address: ' + identity.getPrincipal().toText())
  );
  return process.exit(0);
});
wallet
.command('import')
.description('Import a new wallet')
.requiredOption('-m, --mnemonic <mnemonic>', 'The mnemonic to import')
.action(async () => {
  if (config.has('wallet')) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.red.bold('A wallet already exists - do you want to continue? THIS WILL DELETE THE EXISTING WALLET'),
        default: false
      }
    ]);

    if (!answers.continue) {
      return process.exit(0);
    }

    config.delete('wallet');
  }
  let mnemonic = options.mnemonic;
  let identity = mnemonicToId(mnemonic);
  config.set('wallet', {
    mnemonic: mnemonic,
    address: identity.getPrincipal().toText()
  });
  console.log(
    chalk.green('Wallet imported with address: ' + identity.getPrincipal().toText())
  );
  return process.exit(0);
});
wallet
.command('export')
.description('Export the seedphrase for the wallet')
.action(() => {
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
  } else {
    console.log(
      chalk.green('Seedphrase: ' + config.get('wallet').mnemonic)
    )
  }
  return process.exit(0);
});
wallet
.command('address')
.description('Get the deposit address to send CKBTC funds to. DO NOT SEND OTHER ASSETS')
.action(() => {
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
  } else {
    console.log(
      chalk.white('Deposit Address (only ckBTC): ' + config.get('wallet').address)
    )
    console.log(
      chalk.yellow('Please remember to use the `bioniq wallet receive` command after sending funds to this address.')
    )  
  }
  return process.exit(0);
});
wallet
.command('receive')
.description('After sending ckBTC to your address, you need to call this to receive the tokens.')
.action(async () => {
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    
    return process.exit(0);
  } else {
    startSpinner("Loading...", framesLoading);
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let ckbtc = createIcpApi(CKBTC_CID, CKBTCIDL, identity);
    let balance = Number(await ckbtc.icrc1_balance_of({
      owner : identity.getPrincipal(),
      subaccount : []
    }));
    if (balance <= 10) {
      stopSpinner();
      console.log(
        chalk.red('No balance above 10 sats found - please send some ckBTC to ' + config.get('wallet').address + ' and try again.')
      )
    } else {
      logSpinner(
        chalk.green('Deposit found: ' + balance + ' sats - receiving...')
      )
      let resp = await ckbtc.icrc1_transfer(
        {
          to : {
            owner : Principal.fromText(VOLT_CID),
            subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
          },
          fee : [10],
          memo : [],
          from_subaccount : [],
          created_at_time : [],
          amount : BigInt(balance - 10),
        }
      );
      if (resp.hasOwnProperty('Err')) {
        stopSpinner();
        console.log(
          chalk.red('There was an error receiving your ckBTC - please try again later.')
        )
        console.log(
          chalk.yellow(JSON.stringify(resp.Err))
        )
        return process.exit(0);
      }
      logSpinner(
        chalk.green('ckBTC received, checking balance...')
      )
      let newBalance = await ckbtc.icrc1_balance_of({
        owner : Principal.fromText(VOLT_CID),
        subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
      });
      stopSpinner();
      console.log(
        chalk.white('New balance: ' + Number(newBalance) + ' sats')
      )
    }
    return process.exit(0);
  }
});
wallet
.command('balance')
.description('Shows your current balance of ckBTC in your Volt address.')
.action(async () => {
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    return process.exit(0);
  } else {
    startSpinner("Loading...", framesLoading);
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let ckbtc = createIcpApi(CKBTC_CID, CKBTCIDL);
    let balance = await ckbtc.icrc1_balance_of({
      owner : Principal.fromText(VOLT_CID),
      subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
    });
    stopSpinner();
    console.log(
      chalk.white('Balance: ' + Number(balance) + ' sats')
    )
    return process.exit(0);
  }
});
wallet
.command('send')
.requiredOption('-a, --address <address>', 'The address to send to')
.requiredOption('-m, --amount <amount>', 'The amount (in SATs) to send')
.description('Send ckBTC from this to another address, like back to bioniq.')
.action(async (options) => {
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    
    return process.exit(0);
  } else {
    startSpinner("Loading...", framesLoading);
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let ckbtc = createIcpApi(CKBTC_CID, CKBTCIDL);
    let amountToSend = Number(options.amount);
    let balance = await ckbtc.icrc1_balance_of({
      owner : Principal.fromText(VOLT_CID),
      subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
    });
    if ((amountToSend+10) > Number(balance)) {
      stopSpinner();
      console.log(
        chalk.red('Insufficient balance - please try again with a lower amount.')
      )
      return process.exit(0);
    }
    let volt = createIcpApi(VOLT_CID, VOLTIDL, identity);
    let resp = await volt.user_transfer(
      {
        standard : "icrc1",
        canister : CKBTC_CID,
        to : options.address,
        amount : amountToSend,
        fee : [10],
        id : [],
        memo : [],
        notify : [],
        other : [],
      }
    );
    if (resp.hasOwnProperty('err')) {
      stopSpinner();
      console.log(
        chalk.red('There was an error sending your ckBTC - please try again later.')
      )
      console.log(
        chalk.yellow(resp.err)
      )
      return process.exit(0);
    }
    logSpinner(
      chalk.green('Transaction sent, checking balance...')
    )
    let newBalance = await ckbtc.icrc1_balance_of({
      owner : Principal.fromText(VOLT_CID),
      subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
    });
    stopSpinner();
    console.log(
      chalk.white('New balance: ' + Number(newBalance) + ' sats')
    )
    return process.exit(0);
  }
});

module.exports = wallet;