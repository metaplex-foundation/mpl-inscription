import {
  TransactionBuilder,
  generateSigner,
  percentAmount,
} from '@metaplex-foundation/umi';
import {
  TokenStandard,
  createV1,
  mintV1,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import test from 'ava';
import {
  MPL_INSCRIPTION_PROGRAM_ID,
  allocate,
  findAssociatedInscriptionPda,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
  initialize,
  initializeAssociatedInscription,
  initializeFromMint,
  writeData,
} from '../src';
import { createUmi } from './_setup';

const fs = require('fs');

test('it can write JSON data to an inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      value: Buffer.from(
        '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
      ),
      associatedTag: null,
      offset: 0,
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write JSON data to a mint inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  umi.use(mplTokenMetadata());

  const mint = generateSigner(umi);
  await createV1(umi, {
    mint,
    name: 'My NFT',
    uri: 'https://arweave.net/LcjCf-NDr5bhCJ0YMKGlc8m8qT_J6TDWtIuW8lbu0-A',
    sellerFeeBasisPoints: percentAmount(5.5),
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  await mintV1(umi, {
    mint: mint.publicKey,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  const inscriptionAccount = await findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initializeFromMint(umi, {
      mintAccount: mint.publicKey,
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount[0],
      inscriptionMetadataAccount,
      value: Buffer.from(
        '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
      ),
      associatedTag: null,
      offset: 0,
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount[0]);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write JSON data to an inscription account with a separate authority', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);
  const authority = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
      authority,
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      authority,
      value: Buffer.from(
        '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
      ),
      associatedTag: null,
      offset: 0,
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write JSON data to an inscription account in multiple batches', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      value: Buffer.from('{"description": "A bread! But on-chain!"'),
      associatedTag: null,
      offset: 0,
    })
  );

  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      value: Buffer.from(', "external_url":'),
      associatedTag: null,
      offset: '{"description": "A bread! But on-chain!"'.length,
    })
  );

  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      value: Buffer.from(' "https://breadheads.io"}'),
      associatedTag: null,
      offset: '{"description": "A bread! But on-chain!", "external_url":'
        .length,
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write Image data to an associated inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
    })
  );

  const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    associated_tag: 'image',
    inscriptionMetadataAccount,
  });

  builder = builder.add(
    initializeAssociatedInscription(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      associationTag: 'image',
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Open the image file to fetch the raw bytes.
  const imageBytes: Buffer = await fs.promises.readFile('test/bread.png');

  // And set the value.
  const promises = [];
  const chunkSize = 500;
  for (let i = 0; i < imageBytes.length; i += chunkSize) {
    const chunk = imageBytes.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    promises.push(
      writeData(umi, {
        inscriptionAccount: associatedInscriptionAccount,
        inscriptionMetadataAccount,
        value: chunk,
        associatedTag: 'image',
        offset: i,
      }).sendAndConfirm(umi)
    );
  }

  await Promise.all(promises);

  // Then an account was created with the correct data.
  const imageData = await umi.rpc.getAccount(associatedInscriptionAccount[0]);
  if (imageData.exists) {
    t.deepEqual(Buffer.from(imageData.data), imageBytes);

    t.like(imageData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write Image data to an associated mint inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  umi.use(mplTokenMetadata());

  const mint = generateSigner(umi);
  await createV1(umi, {
    mint,
    name: 'My NFT',
    uri: 'https://arweave.net/LcjCf-NDr5bhCJ0YMKGlc8m8qT_J6TDWtIuW8lbu0-A',
    sellerFeeBasisPoints: percentAmount(5.5),
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  await mintV1(umi, {
    mint: mint.publicKey,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  const inscriptionAccount = await findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initializeFromMint(umi, {
      mintAccount: mint.publicKey,
    })
  );

  const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    associated_tag: 'image',
    inscriptionMetadataAccount,
  });

  builder = builder.add(
    initializeAssociatedInscription(umi, {
      inscriptionAccount: inscriptionAccount[0],
      associationTag: 'image',
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Open the image file to fetch the raw bytes.
  const imageBytes: Buffer = await fs.promises.readFile('test/bread.png');

  // And set the value.
  const promises = [];
  const chunkSize = 500;
  for (let i = 0; i < imageBytes.length; i += chunkSize) {
    const chunk = imageBytes.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    promises.push(
      writeData(umi, {
        inscriptionAccount: associatedInscriptionAccount,
        inscriptionMetadataAccount,
        value: chunk,
        associatedTag: 'image',
        offset: i,
      }).sendAndConfirm(umi)
    );
  }

  await Promise.all(promises);

  // Then an account was created with the correct data.
  const imageData = await umi.rpc.getAccount(associatedInscriptionAccount[0]);
  if (imageData.exists) {
    t.deepEqual(Buffer.from(imageData.data), imageBytes);

    t.like(imageData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can write Image data to an associated inscription account, with prealloc', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
    })
  );

  const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    associated_tag: 'image',
    inscriptionMetadataAccount,
  });

  builder = builder.add(
    initializeAssociatedInscription(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      associationTag: 'image',
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Open the image file to fetch the raw bytes.
  const imageBytes: Buffer = await fs.promises.readFile('test/large_bread.png');
  const resizes = Math.floor(imageBytes.length / 10240) + 1;
  for (let i = 0; i < resizes; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await allocate(umi, {
      inscriptionAccount: associatedInscriptionAccount,
      inscriptionMetadataAccount,
      associatedTag: 'image',
      targetSize: imageBytes.length,
    }).sendAndConfirm(umi);
  }

  const sizedAccount = await umi.rpc.getAccount(
    associatedInscriptionAccount[0]
  );
  if (sizedAccount.exists) {
    t.is(sizedAccount.data.length, imageBytes.length);
  }

  // And set the value.
  const promises = [];
  const chunkSize = 500;
  for (let i = 0; i < imageBytes.length; i += chunkSize) {
    const chunk = imageBytes.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    promises.push(
      writeData(umi, {
        inscriptionAccount: associatedInscriptionAccount,
        inscriptionMetadataAccount,
        value: chunk,
        associatedTag: 'image',
        offset: i,
      }).sendAndConfirm(umi)
    );
  }

  await Promise.all(promises);

  // Then an account was created with the correct data.
  const imageData = await umi.rpc.getAccount(associatedInscriptionAccount[0]);
  if (imageData.exists) {
    t.deepEqual(Buffer.from(imageData.data), imageBytes);

    t.like(imageData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});
