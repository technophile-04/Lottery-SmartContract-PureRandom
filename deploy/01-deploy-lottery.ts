import { verify } from "../utils/verify";
import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { networkConfig } from "../helper-hardhat.config";
import { developmentChains } from "../helper-hardhat.config";
import { VRFCoordinatorV2Mock } from "../typechain";

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("10");

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId as number;

    let VRFCoordinatorV2Address: string;
    let subId;

    if (developmentChains.includes(network.name)) {
        const VRFCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        );
        VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address;
        const txnResponse = await VRFCoordinatorV2Mock.createSubscription();
        const txnReceipt = await txnResponse.wait();
        subId = txnReceipt.events![0]?.args?.subId;

        const txnRes = await VRFCoordinatorV2Mock.fundSubscription(subId, VRF_SUB_FUND_AMOUNT);
        await txnRes.wait(1);
    } else {
        VRFCoordinatorV2Address = networkConfig[chainId!]["VRFCoordinatorV2"];
    }

    const ENTRANCE_FEE = networkConfig[chainId!]["entranceFee"];
    const GAS_LANE = networkConfig[chainId!]["gasLane"];
    const CALLBACK_GAS_LIMIT = networkConfig[chainId!]["callBackGasLimit"];
    const INTERVAL = networkConfig[chainId!]["interval"];

    const args = [
        VRFCoordinatorV2Address,
        ENTRANCE_FEE,
        GAS_LANE,
        subId,
        CALLBACK_GAS_LIMIT,
        INTERVAL,
    ];

    const lottery = await deploy("Lottery", {
        from: deployer,
        log: true,
        waitConfirmations: networkConfig[chainId]?.blockConfirmations || 1,
        args,
    });

    log("Lottery deployed successfully !");

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(lottery.address, args);
        log("Verified");
    }

    log("--------------------------------------------------------");
};

export default deployFunc;
deployFunc.tags = ["all", "main"];
