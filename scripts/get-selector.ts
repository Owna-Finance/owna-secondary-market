import { toEventSelector } from "viem";

console.info(
  toEventSelector(
    "SwapExecuted(address,address,string,address,uint256,address,uint256)"
  )
);
