import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SecondaryMarketModule", (m) => {
  const secondaryMarket = m.contract("SecondaryMarket");

  return { secondaryMarket };
});
