import { expect } from 'chai';
import { ZeroHash, keccak256, toUtf8Bytes } from 'ethers';
import { network } from 'hardhat';
import { PharmaCustodyRegistry__factory } from '../../types/ethers-contracts/factories/PharmaCustodyRegistry__factory.js';

describe('PharmaCustodyRegistry', function () {
  async function fixture() {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const manufacturer = signers[0]!;
    const distributor = signers[1]!;
    const pharmacy = signers[2]!;
    const verifier = signers[3]!;
    const outsider = signers[4]!;
    const registry = await new PharmaCustodyRegistry__factory(manufacturer).deploy();
    await registry.waitForDeployment();
    const hash = (value: string) => keccak256(toUtf8Bytes(value));

    await registry
      .connect(manufacturer)
      .registerActor(manufacturer.address, 1, hash('manufacturer-key'));
    await registry
      .connect(distributor)
      .registerActor(distributor.address, 2, hash('distributor-key'));
    await registry.connect(pharmacy).registerActor(pharmacy.address, 3, hash('pharmacy-key'));
    await registry.connect(verifier).registerActor(verifier.address, 4, hash('verifier-key'));
    return { registry, manufacturer, distributor, pharmacy, verifier, outsider, hash };
  }

  it('registers actors with their role and public-key hash', async function () {
    const { registry, manufacturer, hash } = await fixture();
    const actor = await registry.actors(manufacturer.address);
    expect(actor.registered).to.equal(true);
    expect(actor.role).to.equal(1);
    expect(actor.publicKeyHash).to.equal(hash('manufacturer-key'));
  });

  it('rejects duplicate actors and self-registration by another address', async function () {
    const { registry, manufacturer, distributor, hash } = await fixture();
    await expect(
      registry.connect(manufacturer).registerActor(manufacturer.address, 1, hash('new-key')),
    ).to.be.revertedWithCustomError(registry, 'ActorAlreadyRegistered');
    await expect(
      registry.connect(manufacturer).registerActor(distributor.address, 2, hash('spoofed-key')),
    ).to.be.revertedWithCustomError(registry, 'ActorNotRegistered');
  });

  it('creates a lot only for a manufacturer and stores the initial event hash', async function () {
    const { registry, manufacturer, distributor, hash } = await fixture();
    const lotId = hash('LOT-001');
    const metadataHash = hash('fictional-metadata');
    const eventHash = hash('create-event');
    await expect(registry.connect(manufacturer).createLot(lotId, metadataHash, eventHash))
      .to.emit(registry, 'LotCreated')
      .withArgs(lotId, metadataHash, manufacturer.address, eventHash);
    const lot = await registry.lots(lotId);
    expect(lot.custodian).to.equal(manufacturer.address);
    expect(await registry.getLotEventHashes(lotId)).to.deep.equal([eventHash]);
    await expect(
      registry.connect(distributor).createLot(hash('LOT-002'), metadataHash, eventHash),
    ).to.be.revertedWithCustomError(registry, 'OnlyManufacturer');
    await expect(
      registry.connect(manufacturer).createLot(lotId, metadataHash, eventHash),
    ).to.be.revertedWithCustomError(registry, 'LotAlreadyExists');
  });

  it('transfers custody only from the current custodian to a registered non-verifier', async function () {
    const { registry, manufacturer, distributor, verifier, outsider, hash } = await fixture();
    const lotId = hash('LOT-002');
    await registry.connect(manufacturer).createLot(lotId, hash('metadata'), hash('create-event'));

    await expect(
      registry.connect(outsider).transferCustody(lotId, distributor.address, hash('bad')),
    ).to.be.revertedWithCustomError(registry, 'OnlyCurrentCustodian');
    await expect(
      registry.connect(manufacturer).transferCustody(lotId, outsider.address, hash('bad')),
    ).to.be.revertedWithCustomError(registry, 'ActorNotRegistered');
    await expect(
      registry.connect(manufacturer).transferCustody(lotId, verifier.address, hash('bad')),
    ).to.be.revertedWithCustomError(registry, 'VerifierCannotHoldCustody');

    const transferHash = hash('transfer-event');
    await expect(
      registry.connect(manufacturer).transferCustody(lotId, distributor.address, transferHash),
    )
      .to.emit(registry, 'CustodyTransferred')
      .withArgs(lotId, manufacturer.address, distributor.address, transferHash);
    await expect(
      registry.connect(manufacturer).transferCustody(lotId, distributor.address, hash('bad')),
    ).to.be.revertedWithCustomError(registry, 'OnlyCurrentCustodian');
    expect((await registry.lots(lotId)).custodian).to.equal(distributor.address);
    expect(await registry.getLotEventHashes(lotId)).to.deep.equal([
      hash('create-event'),
      transferHash,
    ]);
  });

  it('rejects invalid hashes and unknown lots', async function () {
    const { registry, manufacturer, hash } = await fixture();
    await expect(
      registry.connect(manufacturer).createLot(ZeroHash, hash('metadata'), hash('event')),
    ).to.be.revertedWithCustomError(registry, 'InvalidLotIdentifier');
    await expect(
      registry.connect(manufacturer).createLot(hash('LOT-003'), ZeroHash, hash('event')),
    ).to.be.revertedWithCustomError(registry, 'InvalidMetadataHash');
    await expect(
      registry.connect(manufacturer).createLot(hash('LOT-003'), hash('metadata'), ZeroHash),
    ).to.be.revertedWithCustomError(registry, 'InvalidEventHash');
    await expect(registry.getLotEventHashes(hash('unknown'))).to.be.revertedWithCustomError(
      registry,
      'LotNotFound',
    );
  });
});
