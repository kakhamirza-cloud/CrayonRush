const hre = require("hardhat");

async function main() {
  const signer = process.env.GAME_SIGNER_ADDRESS;
  if (!signer) throw new Error("Set GAME_SIGNER_ADDRESS in .env");
  const Contract = await hre.ethers.getContractFactory("CrayonCoreDemo");
  const c = await Contract.deploy(signer);
  await c.waitForDeployment();
  console.log("CrayonCoreDemo deployed to:", await c.getAddress());
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
