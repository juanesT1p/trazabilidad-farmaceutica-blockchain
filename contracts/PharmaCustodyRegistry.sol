// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract PharmaCustodyRegistry {
    enum Role {
        None,
        Manufacturer,
        Distributor,
        Pharmacy,
        Verifier
    }

    struct Actor {
        bool registered;
        Role role;
        bytes32 publicKeyHash;
    }

    struct Lot {
        bool exists;
        bytes32 metadataHash;
        address custodian;
    }

    mapping(address => Actor) public actors;
    mapping(bytes32 => Lot) public lots;
    mapping(bytes32 => bytes32[]) private lotEventHashes;

    error ActorAlreadyRegistered();
    error ActorNotRegistered(address actor);
    error InvalidActorRole();
    error InvalidPublicKeyHash();
    error LotAlreadyExists(bytes32 lotId);
    error LotNotFound(bytes32 lotId);
    error OnlyManufacturer();
    error OnlyCurrentCustodian();
    error InvalidLotIdentifier();
    error InvalidMetadataHash();
    error InvalidEventHash();
    error VerifierCannotHoldCustody();

    event ActorRegistered(address indexed actor, Role role, bytes32 publicKeyHash);
    event LotCreated(bytes32 indexed lotId, bytes32 metadataHash, address indexed custodian, bytes32 eventHash);
    event CustodyTransferred(
        bytes32 indexed lotId,
        address indexed from,
        address indexed to,
        bytes32 eventHash
    );

    function registerActor(address actor, Role role, bytes32 publicKeyHash) external {
        if (actor != msg.sender) revert ActorNotRegistered(msg.sender);
        if (actors[actor].registered) revert ActorAlreadyRegistered();
        if (role == Role.None) revert InvalidActorRole();
        if (publicKeyHash == bytes32(0)) revert InvalidPublicKeyHash();

        actors[actor] = Actor(true, role, publicKeyHash);
        emit ActorRegistered(actor, role, publicKeyHash);
    }

    function createLot(bytes32 lotId, bytes32 metadataHash, bytes32 eventHash) external {
        Actor memory actor = actors[msg.sender];
        if (!actor.registered) revert ActorNotRegistered(msg.sender);
        if (actor.role != Role.Manufacturer) revert OnlyManufacturer();
        if (lotId == bytes32(0)) revert InvalidLotIdentifier();
        if (metadataHash == bytes32(0)) revert InvalidMetadataHash();
        if (eventHash == bytes32(0)) revert InvalidEventHash();
        if (lots[lotId].exists) revert LotAlreadyExists(lotId);

        lots[lotId] = Lot(true, metadataHash, msg.sender);
        lotEventHashes[lotId].push(eventHash);
        emit LotCreated(lotId, metadataHash, msg.sender, eventHash);
    }

    function transferCustody(bytes32 lotId, address to, bytes32 eventHash) external {
        Lot storage lot = lots[lotId];
        if (!lot.exists) revert LotNotFound(lotId);
        if (lot.custodian != msg.sender) revert OnlyCurrentCustodian();
        Actor memory recipient = actors[to];
        if (!recipient.registered) revert ActorNotRegistered(to);
        if (recipient.role == Role.Verifier) revert VerifierCannotHoldCustody();
        if (eventHash == bytes32(0)) revert InvalidEventHash();

        address previousCustodian = lot.custodian;
        lot.custodian = to;
        lotEventHashes[lotId].push(eventHash);
        emit CustodyTransferred(lotId, previousCustodian, to, eventHash);
    }

    function getLotEventHashes(bytes32 lotId) external view returns (bytes32[] memory) {
        if (!lots[lotId].exists) revert LotNotFound(lotId);
        return lotEventHashes[lotId];
    }
}
