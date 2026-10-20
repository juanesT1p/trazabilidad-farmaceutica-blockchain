-- CreateTable
CREATE TABLE "Actor" (
    "address" VARCHAR(42) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "level" INTEGER NOT NULL,
    "publicKeyHash" VARCHAR(66) NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "metadataHash" VARCHAR(66) NOT NULL,
    "currentCustodian" VARCHAR(42) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "fromAddress" VARCHAR(42),
    "toAddress" VARCHAR(42) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "metadata" JSONB NOT NULL,
    "prevEventHash" VARCHAR(66),
    "eventHash" VARCHAR(66) NOT NULL,
    "canonicalJson" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventHash_key" ON "Event"("eventHash");

-- CreateIndex
CREATE INDEX "Event_lotId_timestamp_idx" ON "Event"("lotId", "timestamp");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_currentCustodian_fkey" FOREIGN KEY ("currentCustodian") REFERENCES "Actor"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_fromAddress_fkey" FOREIGN KEY ("fromAddress") REFERENCES "Actor"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_toAddress_fkey" FOREIGN KEY ("toAddress") REFERENCES "Actor"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
