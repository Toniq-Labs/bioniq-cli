const { Command } = require('commander');
const chalk = require('chalk')
const conf = require('conf')
const sweep = new Command('sweep');
const inquirer = require('inquirer');
const {Principal} = require('@dfinity/principal');
const { changeSpinner, logSpinner, stopSpinner, startSpinner}= require('../utility/spinner.js');
const { getVoltAddress, constructVoltMemo, getSubaccountFromPrincipal, createIcpApi, mnemonicToId, VOLT_CID, CKBTC_CID, VOLTIDL, CKBTCIDL, TRADE_CID}= require('../utility/icp.js');
const { getAllOwnedInscriptions, doConcurrent, getInscriptionsToBuy}= require('../utility/utility.js');
const config = new conf();
const framesLoading = ['-', '\\', '|', '/'];
const framesSweeping = [' .|  ', '  \\.o', '  |. ', 'o./  '];
sweep
    .description('Sweep the floor for a collection, set max price, max purchases and total cost')
    .requiredOption('-c, --collection <collection>', 'The ID of the collection from bioniq')
    .option('-p, --price <price>', 'Max price (in SATs) to sweep floor until')
    .option('-n, --number <number>', 'Max number of NFTs to sweep from the floor')
    .option('-m, --max <max>', 'Max total (in SATs) to sweep from the floor')
    .action(async (options) => {
        if (!options.price && !options.number && !options.max) {
            console.error(chalk.red.bold('Error: You must provide at least one of the --price, --number, or --max options.'));
            return process.exit(0);
        }
        if (options.price && Number(options.price) == 0) {
            console.error(chalk.red.bold('Price must not be 0 sats'));
            return process.exit(0);
        }
        if (options.number && Number(options.number) == 0) {
            console.error(chalk.red.bold('The max number to buy must not be 0'));
            return process.exit(0);
        }
        if (options.max && Number(options.max) == 0) {
            console.error(chalk.red.bold('The max sats to spend must not be 0'));
            return process.exit(0);
        }
        let collection = options.collection;
        startSpinner("Loading...", framesLoading);
        const data = await (await fetch(`https://api.bioniq.io/v1/collection/${collection}`)).json();
        if (!data) {
            stopSpinner(chalk.red.bold('Invalid collection ID'));
            return process.exit(0);
        }
        let maxPrice = Number(options.price) || 0;
        let maxNumber = Number(options.number) || 0;
        let maxTotal = Number(options.max) || 0;
        let inscriptions = await getInscriptionsToBuy(maxPrice, maxNumber, maxTotal, collection);
        let voltAddress = getVoltAddress(config.get('wallet').address);
        let ownedInscriptionsIds = (await getAllOwnedInscriptions(voltAddress)).map(inscription => inscription.id);
        console.log(ownedInscriptionsIds.length);
        let inscriptionsToBuy = inscriptions.filter(inscription => !ownedInscriptionsIds.includes(inscription.id));
        if (inscriptionsToBuy.length == 0) {
            stopSpinner(chalk.green.bold('No inscriptions to buy'));
            return process.exit(0);
        };
        let total = inscriptionsToBuy.reduce((sum, inscription) => sum + inscription.price+10, 0);
        logSpinner(chalk.yellow(`Found ${inscriptionsToBuy.length} potential inscriptions to buy for a total of ${total} sats`));
        changeSpinner('Checking balance...', framesLoading);
        let mnemonic = config.get('wallet').mnemonic;
        let identity = mnemonicToId(mnemonic);
        let ckbtc = createIcpApi(CKBTC_CID, CKBTCIDL);
        let balance = await ckbtc.icrc1_balance_of({
            owner : Principal.fromText(VOLT_CID),
            subaccount : [getSubaccountFromPrincipal(identity.getPrincipal())]
        });
        logSpinner(chalk.white('Balance: ' + Number(balance) + ' sats'));
        if (total > Number(balance)) {
            stopSpinner();
            const answers = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'continue',
                  message: chalk.red.bold('Your balance is not enough to buy all potential inscriptions, do you want to continue? Any purchases cannot be undone.'),
                  default: false
                }
              ]);
          
              if (!answers.continue) {
                return process.exit(0);
              }
        } else {
            stopSpinner();
            const answers = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'continue',
                  message: chalk.red.bold('Are you sure you want to continue? Any purchases cannot be undone.'),
                  default: false
                }
              ]);
          
              if (!answers.continue) {
                return process.exit(0);
              }
        }
        changeSpinner('Sweeping the floor...', framesSweeping);
        let volt = createIcpApi(VOLT_CID, VOLTIDL, identity);
        await doConcurrent(async (inscription, i) => {
            const tokenId = inscription.tokenid;
            const data = constructVoltMemo({
                type: 'buyListing',
                tokenId: tokenId,
            });
            let resp = await volt.user_authorize(
                {
                    standard : "icrc1",
                    canister : CKBTC_CID,
                    to : identity.getPrincipal().toText(),
                    amount : inscription.price,
                    fee : [10],
                    id : [],
                    memo : [],
                    notify : [],
                    other : [],
                },
                true,
                Principal.fromText(TRADE_CID),
                3600,
                [true],
                [data]
            );
            if (resp.hasOwnProperty('err')) {
                logSpinner(chalk.red.bold(`Error buying ${inscription.id}`));
            } else {
                logSpinner(chalk.green.bold(`Bought ${inscription.id}`));
            };
            fetch(`https://api.bioniq.io/v1/inscription/${inscription.id}/update`);
        }, inscriptionsToBuy, 5, false, 1000);
        stopSpinner(chalk.green.bold('The floor has been swept!'));
        return process.exit(0);
    });
module.exports = sweep