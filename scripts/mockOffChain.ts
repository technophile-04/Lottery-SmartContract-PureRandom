import { ethers, network } from "hardhat";
import { Lottery } from "../typechain";

const mockKeepers = async () => {
    const lottery = (await ethers.getContract("Lottery")) as Lottery;

    const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

    if (upkeepNeeded) {
        const txnReceipt = await lottery.performUpkeep([]);
        const txnResponse = await txnReceipt.wait(1);
        const requestId = txnResponse.events![1].args?.requestId;
        console.log(`Performed upkeep with RequestId: ${requestId}`);
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, lottery);
        }
    }
};

const mockVrf = async (requestId: number, lottery: Lottery) => {
    console.log("We on a local network? Ok let's pretend...");
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
    console.log("Responded!");
    const recentWinner = await lottery.getRecentWinner();
    console.log(`The winner is: ${recentWinner}`);
};

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
