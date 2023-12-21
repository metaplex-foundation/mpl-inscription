import test from 'ava';
import { PublicKey, generateSigner } from '@metaplex-foundation/umi';
import {
    DataType,
    InscriptionMetadata,
    Key,
    MPL_INSCRIPTION_PROGRAM_ID,
    addAuthority,
    fetchInscriptionMetadata,
    fetchInscriptionShard,
    findInscriptionMetadataPda,
    initialize,
    removeAuthority,
    writeData,
} from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can add an authority to an inscription', async (t) => {
    // Given a Umi instance and a new signer.
    const umi = await createUmi();
    const inscriptionAccount = generateSigner(umi);
    const authority = generateSigner(umi);

    const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
        inscriptionAccount: inscriptionAccount.publicKey,
    });

    const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
    const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

    // When we create a new account.
    await initialize(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount,
        inscriptionShardAccount,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    let inscriptionMetadata = await fetchInscriptionMetadata(
        umi,
        inscriptionMetadataAccount
    );

    const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
    t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

    t.like(inscriptionMetadata, <InscriptionMetadata>{
        key: Key.InscriptionMetadataAccount,
        bump: inscriptionMetadataAccount[1],
        dataType: DataType.Uninitialized,
        inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
        updateAuthorities: [umi.identity.publicKey],
    });

    const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
    if (jsonData.exists) {
        t.like(jsonData, {
            owner: MPL_INSCRIPTION_PROGRAM_ID,
            data: Uint8Array.from([]),
        });
    }

    await addAuthority(umi, {
        inscriptionMetadataAccount,
        newAuthority: authority.publicKey,
    }).sendAndConfirm(umi);

    inscriptionMetadata = await fetchInscriptionMetadata(
        umi,
        inscriptionMetadataAccount
    );

    t.like(inscriptionMetadata, <InscriptionMetadata>{
        key: Key.InscriptionMetadataAccount,
        bump: inscriptionMetadataAccount[1],
        dataType: DataType.Uninitialized,
        inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
        updateAuthorities: [umi.identity.publicKey, authority.publicKey],
    });
});

test('it can make an inscription immutable', async (t) => {
    // Given a Umi instance and a new signer.
    const umi = await createUmi();
    const inscriptionAccount = generateSigner(umi);

    const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
        inscriptionAccount: inscriptionAccount.publicKey,
    });

    const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
    const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

    // When we create a new account.
    await initialize(umi, {
        inscriptionAccount,
        inscriptionMetadataAccount,
        inscriptionShardAccount,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    let inscriptionMetadata = await fetchInscriptionMetadata(
        umi,
        inscriptionMetadataAccount
    );

    const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
    t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

    t.like(inscriptionMetadata, <InscriptionMetadata>{
        key: Key.InscriptionMetadataAccount,
        bump: inscriptionMetadataAccount[1],
        dataType: DataType.Uninitialized,
        inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
        updateAuthorities: [umi.identity.publicKey],
    });

    const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
    if (jsonData.exists) {
        t.like(jsonData, {
            owner: MPL_INSCRIPTION_PROGRAM_ID,
            data: Uint8Array.from([]),
        });
    }

    await removeAuthority(umi, {
        inscriptionMetadataAccount,
    }).sendAndConfirm(umi);

    inscriptionMetadata = await fetchInscriptionMetadata(
        umi,
        inscriptionMetadataAccount
    );

    t.like(inscriptionMetadata, <InscriptionMetadata>{
        key: Key.InscriptionMetadataAccount,
        bump: inscriptionMetadataAccount[1],
        dataType: DataType.Uninitialized,
        inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
        updateAuthorities: [] as PublicKey[],
    });

    const promise = writeData(umi, {
        inscriptionAccount: inscriptionAccount.publicKey,
        inscriptionMetadataAccount,
        value: Buffer.from(
            '{"description": "This will fail!"'
        ),
    }).sendAndConfirm(umi);

    await t.throwsAsync(promise, { name: "InvalidAuthority" });
});
