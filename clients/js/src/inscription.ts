import {
  Context,
  Pda,
  PublicKey,
  publicKey as toPublicKey,
  RpcGetAccountOptions,
  assertAccountExists,
} from '@metaplex-foundation/umi';

export async function fetchInscription(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<Uint8Array> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'InscriptionMetadata');
  return maybeAccount.data;
}
