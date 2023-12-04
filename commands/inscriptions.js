const { Command } = require('commander');
const inscriptions = new Command('inscriptions').description('Inscription related functions (list, delist, send)');
const chalk = require('chalk')
const conf = require('conf')
const inquirer = require('inquirer');
const {Principal} = require('@dfinity/principal');
const config = new conf();
const { constructVoltMemo, decodeTokenId, createIcpApi, mnemonicToId, VOLT_CID, VOLTIDL, getVoltAddress, BIONIQ_CID, TRADE_CID, TRADEIDL}= require('../utility/icp.js');
const { isValidP2wpkhAddress, getAllOwnedInscriptions, doConcurrent }= require('../utility/utility.js');
const { logSpinner, stopSpinner, startSpinner}= require('../utility/spinner.js');
const framesLoading = ['-', '\\', '|', '/'];
inscriptions
.command('owned')
.description('Display all owned inscriptions - you can filter by collection with the --collection option')
.option('-c, --collection <collection>', 'The collection to filter by')
.option('-l, --listed', 'Only display listed inscriptions')
.option('-u, --unlisted', 'Only display unlisted inscriptions')
.action(async (options) => {
  const listedOnly = options.listed || false;
  const unlistedOnly = options.unlisted || false;
  if (listedOnly && unlistedOnly) {
    console.error(chalk.red.bold('Error: You cannot use both --listed and --unlisted'));
    return process.exit(0);
  }
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    return process.exit(0);
  } else {
    startSpinner("Loading...", framesLoading);
    let voltAddress = getVoltAddress(config.get('wallet').address);
    let inscriptions = await getAllOwnedInscriptions(voltAddress);
    if (listedOnly) inscriptions = inscriptions.filter(inscription => inscription.listing_type == "listed");
    if (unlistedOnly) inscriptions = inscriptions.filter(inscription => (["unlisted", "last", "offer"].indexOf(inscription.listing_type) >= 0));
    stopSpinner(chalk.green.bold('Found ' + inscriptions.length + ' inscriptions'));
    inscriptions.forEach((inscription) => {
      console.log(chalk.green.bold(inscription.id) + (inscription.collection ? ' (' + inscription.collection + ')' : '') + (inscription.listing_type == 'listed' ? ' Listed for '+inscription.price + ' sats': ''))
    });
    return process.exit(0);
  }
});
inscriptions
.command('list')
.description('List all inscriptions that are owned - you can filter by collection with the --collection option, or using --id to list a specific inscription. This will only list unlisted inscriptions - use --updateListed to update existing listings')
.option('-u, --updateListed', 'Force update existing listings')
.option('-c, --collection <collection>', 'The collection to filter by')
.option('-i, --id <inscriptionId>', 'The inscription ID of the inscription to list')
.requiredOption('-a, --amount <amount>', 'The amount in sats to list the inscription/s for')
.action(async (options) => {
  const collection = options.collection || '';
  const inscriptionId = options.id || '';
  const amount = Number(options.amount);
  const updateListed = options.updateListed || false;
  if (amount < 500) {
    console.error(chalk.red.bold('Minimum listing amount is 500 sats'));
    return process.exit(0);
  }
  if (collection && inscriptionId) {
    console.error(chalk.red.bold('Error: You cannot use both --collection and --id'));
    return process.exit(0);
  }
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    return process.exit(0);
  } else {
    startSpinner("Loading inscriptions...", framesLoading);
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let voltAddress = getVoltAddress(identity.getPrincipal().toText());
    let inscriptionsToList = await getAllOwnedInscriptions(voltAddress);
    if (!updateListed) {
      inscriptionsToList = inscriptionsToList.filter(inscription => (["unlisted", "last", "offer"].indexOf(inscription.listing_type) >= 0));
    }
    if (collection) {
      inscriptionsToList = inscriptionsToList.filter(inscription => inscription.collection == collection);
      if (inscriptionsToList.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for collection ' + collection));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToList.length + ' inscriptions for collection ' + collection));
      const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: chalk.red.bold(`You are about to list all inscriptions in the collection ${collection} for ${amount} sats - do you want to continue?`),
            default: false
          }
        ]);
        if (!answers.continue) {
          return process.exit(0);
        }
    } else if (inscriptionId) {
      inscriptionsToList = inscriptionsToList.filter(inscription => inscription.id == inscriptionId);
      if (inscriptionsToList.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for ID ' + inscriptionId));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToList.length + ' inscriptions for ID ' + inscriptionId));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to list the inscription with ID ${inscriptionId} for ${amount} sats - do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    } else {
      if (inscriptionsToList.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found'));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToList.length + ' inscriptions'));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to list all inscriptions for ${amount} sats - do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    }
    startSpinner("Listing inscriptions...", framesLoading);
    let volt = createIcpApi(VOLT_CID, VOLTIDL, identity);
    let bioniq = createIcpApi(TRADE_CID, TRADEIDL, identity);
    await doConcurrent(async (inscription, i) => {
      const tokenId = inscription.tokenid;  
      if (inscription.listing_type == 'listed') {
        if (inscription.listing_amount != amount) {
          let resp = await bioniq.updateListingPrice(tokenId, amount);
          if (resp.hasOwnProperty('err')) {
              logSpinner(chalk.red.bold(`Error updating ${tokenId}`));
          } else {
              logSpinner(chalk.green.bold(`Updated ${tokenId}`));
          };
        };
      } else {
        let tokenIndex = decodeTokenId(tokenId).index;
        const data = constructVoltMemo({
            type: 'createListing',
            amount: amount,
        });
        let resp = await volt.user_authorize(
          {
              standard : "ext",
              canister : BIONIQ_CID,
              to : voltAddress,
              amount : 1,
              fee : [0],
              id : [tokenIndex],
              memo : [],
              notify : [],
              other : [],
          },
          true,
          Principal.fromText(TRADE_CID),
          60*60*24*180,
          [true],
          [data]
        );
        if (resp.hasOwnProperty('err')) {
            logSpinner(chalk.red.bold(`Error listing ${inscription.id}`));
        } else {
            logSpinner(chalk.green.bold(`Listed ${inscription.id}`));
        };
      }
      fetch(`https://api.bioniq.io/v1/inscription/${inscription.id}/update`);
    }, inscriptionsToList, 5, false, 1000);
    stopSpinner(chalk.green.bold('Inscriptions have been listed!'));
    return process.exit(0);
  }
});
inscriptions
.command('delist')
.description('Delist all listed inscriptions - you can filter by collection with the --collection option, or using --id to list a specific inscription')
.option('-c, --collection <collection>', 'The collection to filter by')
.option('-i, --id <inscriptionId>', 'The inscription ID of the inscription to list')
.option('-p, --price <price>', 'Will only delist inscriptions with this price')
.action(async (options) => {
  const collection = options.collection || '';
  const inscriptionId = options.id || '';
  const price = options.price || 0;
  if (collection && inscriptionId) {
    console.error(chalk.red.bold('Error: You cannot use both --collection and --id'));
    return process.exit(0);
  }
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
    return process.exit(0);
  } else {
    startSpinner("Loading inscriptions...", framesLoading);
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let voltAddress = getVoltAddress(identity.getPrincipal().toText());
    let inscriptionsToDelist = await getAllOwnedInscriptions(voltAddress);
    inscriptionsToDelist = inscriptionsToDelist.filter(inscription => inscription.listing_type == "listed");
    if (price) {
      inscriptionsToDelist = inscriptionsToDelist.filter(inscription => inscription.listing_amount == price);
    };
    if (collection) {
      inscriptionsToDelist = inscriptionsToDelist.filter(inscription => inscription.collection == collection);
      if (inscriptionsToDelist.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for collection ' + collection));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToDelist.length + ' inscriptions for collection ' + collection));
      const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: chalk.red.bold(`You are about to delist ${inscriptionsToDelist.length} ${inscriptionsToDelist.length === 1 ? 'inscription' : 'inscriptions'} in the collection ${collection}${price ? ` (max price ${price} sats).` :'.'} Do you want to continue?`),
            default: false
          }
        ]);
        if (!answers.continue) {
          return process.exit(0);
        }
    } else if (inscriptionId) {
      inscriptionsToDelist = inscriptionsToDelist.filter(inscription => inscription.id == inscriptionId);
      if (inscriptionsToDelist.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for ID ' + inscriptionId));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToDelist.length + ' inscriptions for ID ' + inscriptionId));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to delist the inscription with ID ${inscriptionId}${price ? ` (max price ${price} sats).` :'.'} Do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    } else {
      if (inscriptionsToDelist.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found'));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToDelist.length + ' inscriptions'));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to delist ${inscriptionsToDelist.length} ${inscriptionsToDelist.length === 1 ? 'inscription' : 'inscriptions'}${price ? ` (max price ${price} sats).` :'.'} Do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    }
    startSpinner("Delisting inscriptions...", framesLoading);
    let bioniq = createIcpApi(TRADE_CID, TRADEIDL, identity);
    await doConcurrent(async (inscription, i) => {
      const tokenId = inscription.tokenid;  
      let resp = await bioniq.cancelListing(tokenId);
      if (resp.hasOwnProperty('err')) {
          logSpinner(chalk.red.bold(`Error delisting ${tokenId}`));
      } else {
          logSpinner(chalk.green.bold(`Delisted ${tokenId}`));
      };
      fetch(`https://api.bioniq.io/v1/inscription/${inscription.id}/update`);
    }, inscriptionsToDelist, 5, false, 1000);
    stopSpinner(chalk.green.bold('Inscriptions have been delisted!'));
    return process.exit(0);
  }
});
inscriptions
.command('send')
.description('Send unlisted inscriptions to a new address e.g. your bioniq address - you can filter by collection with the --collection option, or using --id to list a specific inscription')
.requiredOption('-a, --address <address>', 'The address to send the inscriptions to. Please use your bioniq `Receive Inscriptions` address')
.option('-c, --collection <collection>', 'The collection to filter by')
.option('-i, --id <inscriptionId>', 'The inscription ID of the inscription to send')
.action(async (options) => {
  const collection = options.collection || '';
  const inscriptionId = options.id || '';
  const address = options.address;
  if (!isValidP2wpkhAddress(address)) {
    console.error(chalk.red.bold('Error: Invalid address'));
    return process.exit(0);
  }
  if (!config.has('wallet')) {
    console.log(
      chalk.red('No wallet created yet - run `bioniq wallet create` first')
    )
  } else {
    startSpinner("Loading inscriptions...", framesLoading);
    const addressLog = await (await fetch(`https://api.bioniq.io/v1/address/${address}`)).json();
    if (addressLog.hasOwnProperty('error')) {
      stopSpinner(chalk.red.bold('Invalid address'));
      return process.exit(0);
    };
    let addressToSendTo = addressLog.address;
    let mnemonic = config.get('wallet').mnemonic;
    let identity = mnemonicToId(mnemonic);
    let voltAddress = getVoltAddress(identity.getPrincipal().toText());
    let inscriptionsToSend = await getAllOwnedInscriptions(voltAddress);
    inscriptionsToSend = inscriptionsToSend.filter(inscription => (["unlisted", "last", "offer"].indexOf(inscription.listing_type) >= 0));
    if (collection) {
      inscriptionsToSend = inscriptionsToSend.filter(inscription => inscription.collection == collection);
      if (inscriptionsToSend.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for collection ' + collection));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToSend.length + ' inscriptions for collection ' + collection));
      const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: chalk.red.bold(`You are about to send ${inscriptionsToSend.length} ${inscriptionsToSend.length === 1 ? 'inscription' : 'inscriptions'} in the collection ${collection} to ${address}. Do you want to continue?`),
            default: false
          }
        ]);
        if (!answers.continue) {
          return process.exit(0);
        }
    } else if (inscriptionId) {
      inscriptionsToSend = inscriptionsToSend.filter(inscription => inscription.id == inscriptionId);
      if (inscriptionsToSend.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found for ID ' + inscriptionId));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToSend.length + ' inscriptions for ID ' + inscriptionId));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to send the inscription with ID ${inscriptionId} to ${address}. Do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    } else {
      if (inscriptionsToSend.length == 0) {
        stopSpinner(chalk.red.bold('No inscriptions found'));
        return process.exit(0);
      }
      stopSpinner(chalk.green.bold('Found ' + inscriptionsToSend.length + ' inscriptions'));
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: chalk.red.bold(`You are about to send ${inscriptionsToSend.length} ${inscriptionsToSend.length === 1 ? 'inscription' : 'inscriptions'} to ${address}. Do you want to continue?`),
          default: false
        }
      ]);
      if (!answers.continue) {
        return process.exit(0);
      }
    }
    startSpinner("Sending inscriptions...", framesLoading);
    let volt = createIcpApi(VOLT_CID, VOLTIDL, identity);
    await doConcurrent(async (inscription, i) => {
      let tokenid = inscription.tokenid;
      let tokenIndex = decodeTokenId(tokenid).index;
      let resp = await volt.user_transfer(
        {
            standard : "ext",
            canister : BIONIQ_CID,
            to : addressToSendTo,
            amount : 1,
            fee : [0],
            id : [tokenIndex],
            memo : [],
            notify : [],
            other : [],
        }
      );
      if (resp.hasOwnProperty('err')) {
          logSpinner(chalk.red.bold(`Error sending ${inscription.id}`));
      } else {
          logSpinner(chalk.green.bold(`Sent ${inscription.id}`));
      };
    }, inscriptionsToSend, 5, false, 1000);
    stopSpinner(chalk.green.bold('Inscriptions have been sent!'));
    return process.exit(0);
  }
});
module.exports = inscriptions;