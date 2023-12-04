const VOLTIDL = ({ IDL }) => {
  const Result_4 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const AccountIdentifier = IDL.Text;
  const TransferResponse = IDL.Record({
    'data' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'error' : IDL.Opt(IDL.Text),
    'success' : IDL.Bool,
  });
  const Result = IDL.Variant({ 'ok' : TransferResponse, 'err' : IDL.Text });
  const TransferRequest__1 = IDL.Record({
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
    'request' : TransferRequest__1,
    'user' : IDL.Principal,
    'binding' : IDL.Bool,
    'expiry' : IDL.Int,
    'receiver' : IDL.Principal,
  });
  const Result_3 = IDL.Variant({ 'ok' : Authorization, 'err' : IDL.Text });
  const SubAccount = IDL.Vec(IDL.Nat8);
  const AddressData = IDL.Record({
    'principal' : IDL.Text,
    'subaccount' : IDL.Opt(SubAccount),
    'address' : AccountIdentifier,
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
  const Result_2 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Tuple(IDL.Nat, IDL.Nat, IDL.Nat),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'acceptCycles' : IDL.Func([], [], []),
    'auth_cancel' : IDL.Func([IDL.Nat], [Result_4], []),
    'auth_capture' : IDL.Func(
        [
          IDL.Nat,
          IDL.Opt(AccountIdentifier),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Bool),
        ],
        [Result],
        [],
      ),
    'auth_get' : IDL.Func([IDL.Nat], [Result_3], []),
    'availableCycles' : IDL.Func([], [IDL.Nat], ['query']),
    'get_authorizations' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(IDL.Tuple(IDL.Nat, Authorization))],
        [],
      ),
    'user_address' : IDL.Func([], [AccountIdentifier], ['query']),
    'user_address_data' : IDL.Func([], [AddressData], ['query']),
    'user_authorizations' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Nat, Authorization))],
        [],
      ),
    'user_authorize' : IDL.Func(
        [
          TransferRequest,
          IDL.Bool,
          IDL.Principal,
          IDL.Int,
          IDL.Opt(IDL.Bool),
          IDL.Opt(IDL.Vec(IDL.Nat8)),
        ],
        [Result_2],
        [],
      ),
    'user_authorized' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Nat)],
        [IDL.Nat, IDL.Nat],
        ['query'],
      ),
    'user_balance' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Nat)],
        [Result_1],
        [],
      ),
    'user_transfer' : IDL.Func([TransferRequest], [Result], []),
  });
};
module.exports = VOLTIDL;