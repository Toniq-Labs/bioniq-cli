const TRADEIDL = ({ IDL }) => {
  const TokenIdentifier = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const SubAccount = IDL.Vec(IDL.Nat8);
  const ICRC1Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(SubAccount),
  });
  const ICRC1TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'BadBurn' : IDL.Record({ 'min_burn_amount' : IDL.Nat }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'BadFee' : IDL.Record({ 'expected_fee' : IDL.Nat }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : IDL.Nat }),
  });
  const MetadataRecord = IDL.Tuple(
    IDL.Text,
    IDL.Variant({
      'hex' : IDL.Text,
      'int' : IDL.Int,
      'nat' : IDL.Nat,
      'principal' : IDL.Principal,
      'blob' : IDL.Vec(IDL.Nat8),
      'bool' : IDL.Bool,
      'nat8' : IDL.Nat8,
      'text' : IDL.Text,
    }),
  );
  const AddEventRequest = IDL.Record({
    'collection' : IDL.Principal,
    'metadata' : IDL.Vec(MetadataRecord),
    'name' : IDL.Text,
  });
  const TransferRequest = IDL.Record({
    'id' : IDL.Opt(IDL.Nat),
    'to' : IDL.Text,
    'fee' : IDL.Opt(IDL.Nat),
    'notify' : IDL.Opt(IDL.Bool),
    'other' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'canister' : IDL.Text,
    'amount' : IDL.Nat,
    'standard' : IDL.Text,
  });
  const Authorization = IDL.Record({
    'request' : TransferRequest,
    'user' : IDL.Principal,
    'binding' : IDL.Bool,
    'expiry' : IDL.Int,
    'receiver' : IDL.Principal,
  });
  const Time = IDL.Int;
  const Security = IDL.Record({
    'auth' : Authorization,
    'time' : Time,
    'authId' : IDL.Nat,
  });
  const ListingType = IDL.Variant({
    'fixed' : IDL.Record({ 'price' : IDL.Nat }),
    'auction' : IDL.Record({
      'bids' : IDL.Vec(Security),
      'startPrice' : IDL.Nat,
    }),
  });
  const Listing = IDL.Record({ 'data' : ListingType, 'security' : Security });
  const Offer = IDL.Record({
    'security' : Security,
    'inscriptionid' : IDL.Text,
  });
  const SettlementType = IDL.Variant({
    'fixed' : IDL.Null,
    'offer' : IDL.Null,
    'aucton' : IDL.Null,
  });
  const Settlement = IDL.Record({
    'ckbtc' : Security,
    'step' : IDL.Nat,
    'time' : Time,
    'subaccount' : SubAccount,
    'stype' : SettlementType,
    'inscription' : Security,
  });
  const Inscribe = IDL.Record({ 'security' : Security });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const CanisterHttpResponsePayload = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : CanisterHttpResponsePayload,
  });
  return IDL.Service({
    'acceptCycles' : IDL.Func([], [], []),
    'adminAddAdmin' : IDL.Func([IDL.Principal], [], []),
    'adminCancelAuth' : IDL.Func([IDL.Nat], [], []),
    'adminFinalizeInscribe' : IDL.Func([TokenIdentifier], [], []),
    'adminRemoveAdmin' : IDL.Func([IDL.Principal], [], []),
    'availableCycles' : IDL.Func([], [IDL.Nat], ['query']),
    'cancelListing' : IDL.Func([TokenIdentifier], [Result], []),
    'cancelOffer' : IDL.Func([IDL.Nat], [Result], []),
    'fixOffer' : IDL.Func([IDL.Nat, IDL.Text], [], []),
    'forceCancelOffer' : IDL.Func([IDL.Nat], [], []),
    'forceEndAuction' : IDL.Func([TokenIdentifier], [], []),
    'getAllDisbursements' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(ICRC1Account, SubAccount, IDL.Nat))],
        ['query'],
      ),
    'getAllErrors' : IDL.Func([], [IDL.Vec(ICRC1TransferError)], ['query']),
    'getAllEventlogs' : IDL.Func([], [IDL.Vec(AddEventRequest)], ['query']),
    'getAllListings' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(TokenIdentifier, Listing))],
        ['query'],
      ),
    'getAllOffers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Nat, Offer))],
        ['query'],
      ),
    'getAllSettlements' : IDL.Func([], [IDL.Vec(Settlement)], ['query']),
    'getBestOffer' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Tuple(IDL.Nat, Offer))],
        ['query'],
      ),
    'getBids' : IDL.Func([TokenIdentifier], [IDL.Vec(Security)], ['query']),
    'getEndedAuctions' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(TokenIdentifier, Listing))],
        [],
      ),
    'getEndedOffers' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat, Offer))], []),
    'getInscribe' : IDL.Func([TokenIdentifier], [IDL.Opt(Inscribe)], ['query']),
    'getListing' : IDL.Func([TokenIdentifier], [IDL.Opt(Listing)], ['query']),
    'getOffer' : IDL.Func([IDL.Nat], [IDL.Opt(Offer)], ['query']),
    'getOffers' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IDL.Tuple(IDL.Nat, Offer))],
        ['query'],
      ),
    'management_settings' : IDL.Func(
        [
          IDL.Record({
            'tasksPerTick' : IDL.Nat,
            'taskRestLength' : IDL.Nat,
            'taskTickLength' : IDL.Nat,
          }),
        ],
        [],
        [],
      ),
    'queue_pending' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'queue_start' : IDL.Func([], [], []),
    'queue_status' : IDL.Func([], [IDL.Bool], ['query']),
    'queue_stop' : IDL.Func([], [], []),
    'showConsoleLog' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'test_fetch' : IDL.Func(
        [TokenIdentifier],
        [IDL.Vec(IDL.Tuple(ICRC1Account, IDL.Nat))],
        [],
      ),
    'transform' : IDL.Func(
        [TransformArgs],
        [CanisterHttpResponsePayload],
        ['query'],
      ),
    'updateAuctionStartPrice' : IDL.Func(
        [TokenIdentifier, IDL.Nat],
        [Result],
        [],
      ),
    'updateListingPrice' : IDL.Func([TokenIdentifier, IDL.Nat], [Result], []),
    'volt_authorization_notification' : IDL.Func(
        [IDL.Nat, Authorization, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [],
        [],
      ),
    'volt_cancel_notification' : IDL.Func([IDL.Nat], [], []),
  });
};
module.exports = TRADEIDL;