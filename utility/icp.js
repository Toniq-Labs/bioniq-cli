const bip39 = require('bip39')
const Ed25519KeyIdentity = require("@dfinity/identity").Ed25519KeyIdentity;
const HttpAgent = require("@dfinity/agent").HttpAgent;
const {Principal} = require('@dfinity/principal');
const Actor = require("@dfinity/agent").Actor;
const TRADEIDL = require("./idl/trade.did.js");
const VOLTIDL = require("./idl/volt.did.js");
const BIONIQIDL = require("./idl/bioniq.did.js");
const CKBTCIDL = require("./idl/ckbtc.did.js");
const extjs = require("./extjs.lib.js").default;
const IDL = require("@dfinity/candid").IDL;
const mnemonicToId = (mnemonic) => {
  var seed = bip39.mnemonicToSeedSync(mnemonic);
  seed = Array.from(seed);
  seed = seed.splice(0, 32);
  seed = new Uint8Array(seed);
  return Ed25519KeyIdentity.generate(seed);
}
const createIcpApi = (canister, idl, identity) => {
  let config = {
    host : "https://boundary.ic0.app/",
  }
  if (identity) {
    config.identity = identity;
  }
  return Actor.createActor(idl, {
    agent : new HttpAgent(config),
    canisterId : canister
  });
};
const to32bits = num => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
}
const TRADE_CID =       "4hxwa-kiaaa-aaaak-qcfca-cai";
const BIONIQ_CID =      "w2nny-fyaaa-aaaak-qce3a-cai";
const VOLT_CID =         "aclt4-uaaaa-aaaak-qb4zq-cai";
const CKBTC_CID =         "mxzaz-hqaaa-aaaar-qaada-cai";
const toHexString = (byteArray) => {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
};
const fromHexString = (hex) => {
    if (hex.substr(0, 2) === '0x') hex = hex.substr(2);
    for (var bytes = [], c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
};
function numberToByteArray(num) {
  if (num < 0) {
      throw new Error('Number must be non-negative');
  }

  const bytes = [];
  while (num > 0) {
      bytes.unshift(num & 0xFF); // Extract the least significant byte
      num >>= 8; // Shift right by 8 bits (move to the next byte)
  }

  return bytes.length > 0 ? bytes : [0];
}
const getSubaccountFromNumber = (n) => {
  const dec = numberToByteArray(n)
  return Array(32 - dec.length)
      .fill(0)
      .concat(dec);
};
const getSubaccountFromHex = (hex) => {
    const dec = fromHexString(hex);
    return Array(32 - dec.length)
        .fill(0)
        .concat(dec);
};
const getSubaccountFromPrincipalText = (principal) => {
    return getSubaccountFromPrincipal(Principal.fromText(principal));
};
const getSubaccountFromPrincipal = (principal) => {
    return getSubaccountFromHex(getHexFromPrincipal(principal));
};
const getHexFromPrincipal = (principal) => {
    return toHexString(principal.toUint8Array());
};
const getVoltAddress = (principal) => {
  return extjs.principalToAccountIdentifier(
      VOLT_CID,
      getSubaccountFromPrincipalText(principal),
  );
}
const constructVoltMemo = (data) => {
    const tt = IDL.Record({
        authtype: IDL.Text,
        amount: IDL.Nat,
        tokenid: IDL.Text,
        offerid: IDL.Nat,
        inscriptionid: IDL.Text,
    });
    const memo = Array.from(
        new Uint8Array(
            IDL.encode(
                [tt],
                [
                    {
                        authtype: data.type,
                        amount: data.hasOwnProperty('amount') ? data.amount : 0,
                        tokenid: data.hasOwnProperty('tokenId') ? data.tokenId : '',
                        inscriptionid: data.hasOwnProperty('inscriptionId')
                            ? data.inscriptionId
                            : '',
                        offerid: data.hasOwnProperty('offerId') ? data.offerId : 0,
                    },
                ],
            ),
        ),
    );
    return memo;
}
const makeTokenId = (tokenindex) => {
  return extjs.encodeTokenId(BIONIQ_CID, tokenindex);
};
const getAllOwnedInscriptions = async (address) => {
  return (await (await fetch(`https://api.bioniq.io/v1/getWrappedForVoltAddress/${address}`)).json()).ordinals;
}
const decodeTokenId = extjs.decodeTokenId;
module.exports = { getAllOwnedInscriptions, decodeTokenId, constructVoltMemo, getSubaccountFromPrincipal, getVoltAddress, createIcpApi, mnemonicToId, TRADE_CID, BIONIQ_CID, VOLT_CID, CKBTC_CID, TRADEIDL, VOLTIDL, BIONIQIDL, CKBTCIDL, makeTokenId}