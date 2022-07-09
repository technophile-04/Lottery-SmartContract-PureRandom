import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat.config";

const BASE_FEE = ethers.utils.parseEther("0.25");

// Calculated value based on the gas price on the chain
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, log } = deployments;

    const { deployer } = await getNamedAccounts();
    const { chainId } = network.config;

    if (developmentChains.includes(network.name)) {
        log("Local network detected, Deploying mocks...");

        const VRFCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock", {
            log: true,
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
        });

        log("Mock deployed !");
    }
};

export default deployMocks;

deployMocks.tags = ["all", "mocks"];
