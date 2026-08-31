const hre = require("hardhat");

async function main() {
  const signer = process.env.GAME_SIGNER_ADDRESS;
  const metadataBase = process.env.METADATA_BASE || "https://crayonrush.fun/api/core/metadata/";
  if (!signer) throw new Error("Set GAME_SIGNER_ADDRESS in .env");

  const TestCrayon = await hre.ethers.getContractFactory("TestCrayon");
  const nft = await TestCrayon.deploy(metadataBase);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();

  const CrayonCore = await hre.ethers.getContractFactory("CrayonCore");
  const core = await CrayonCore.deploy(nftAddress, signer);
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();

  console.log("TestCrayon:", nftAddress);
  console.log("CrayonCore:", coreAddress);
  console.log("");
  console.log("Add these as Cloudflare environment variables:");
  console.log("TEST_CRAYON_ADDRESS=" + nftAddress);
  console.log("CRAYON_CORE_ADDRESS=" + coreAddress);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
