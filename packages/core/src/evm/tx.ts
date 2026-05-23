import {
  type Address,
  type Hex,
  parseEther,
  parseGwei,
  parseTransaction,
  recoverTransactionAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARKIV_BRAGA_CHAIN_ID, ARKIV_STORAGE_ADDRESS, SEPOLIA_CHAIN_ID } from "../chains.js";
import { arkivCreateJsonData, type NumericAnnotation, type StringAnnotation } from "../golem/rlpData.js";

export type RawTxBuildParams = {
  privateKey: Hex;
  nonce: number;
  gas?: bigint;
  gasPriceGwei?: string;
};

export type SepoliaCallParams = RawTxBuildParams & {
  to: Address;
  valueEth?: string;
  data?: Hex;
};

export type ArkivEntityTxParams = RawTxBuildParams & {
  value: object;
  contentType?: string;
  expiresInDays?: number;
  attributes?: Array<StringAnnotation | NumericAnnotation>;
};

function signLegacyTransaction({
  privateKey,
  chainId,
  nonce,
  gas,
  gasPriceGwei,
  to,
  value = 0n,
  data = "0x",
}: RawTxBuildParams & {
  chainId: number;
  to: Address;
  value?: bigint;
  data?: Hex;
}): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);
  return account.signTransaction({
    chainId,
    nonce,
    gas: gas ?? 250_000n,
    gasPrice: parseGwei(gasPriceGwei ?? "2"),
    to,
    value,
    data,
  });
}

export function buildAndSignSepoliaCall(params: SepoliaCallParams): Promise<Hex> {
  return signLegacyTransaction({
    ...params,
    chainId: SEPOLIA_CHAIN_ID,
    gas: params.gas ?? 80_000n,
    value: parseEther(params.valueEth ?? "0"),
    data: params.data ?? "0x",
  });
}

export function buildAndSignArkivEntityCreate(params: ArkivEntityTxParams): Promise<Hex> {
  const createOptions: Parameters<typeof arkivCreateJsonData>[0] = {
    value: params.value,
  };
  if (params.contentType !== undefined) createOptions.contentType = params.contentType;
  if (params.expiresInDays !== undefined) createOptions.expiresInDays = params.expiresInDays;
  if (params.attributes !== undefined) createOptions.attributes = params.attributes;

  const data = arkivCreateJsonData(createOptions);
  const { privateKey, nonce, gas, gasPriceGwei } = params;
  const signParams: RawTxBuildParams & { chainId: number; to: Address; data: Hex } = {
    privateKey,
    nonce,
    chainId: ARKIV_BRAGA_CHAIN_ID,
    gas: gas ?? 1_200_000n,
    to: ARKIV_STORAGE_ADDRESS,
    data,
  };
  if (gasPriceGwei !== undefined) signParams.gasPriceGwei = gasPriceGwei;
  return signLegacyTransaction(signParams);
}

export function parseRawTransaction(rawTx: Hex) {
  return parseTransaction(rawTx);
}

export async function recoverRawTransactionSender(rawTx: Hex): Promise<Address> {
  return recoverTransactionAddress({
    serializedTransaction: rawTx as Parameters<typeof recoverTransactionAddress>[0]["serializedTransaction"],
  });
}
