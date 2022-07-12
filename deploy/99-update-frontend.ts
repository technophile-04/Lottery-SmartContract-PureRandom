import { artifacts, ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import { DeployFunction } from "hardhat-deploy/dist/types";

interface ICurrentAddresses {
    [key: string]: string[];
}

// const contractDir: string = "../lottery-frontend/contracts";
const contractDir: string = path.join("..", "lottery-frontend", "contracts");
const FRONTEND_LOCATION_ADDRESSES_FILE: string = path.join(contractDir, "contract-addresses.json");
const FRONTEND_LOCATION_ABI_FILE: string = path.join(contractDir, "Lottery.json");

const deployFunc: DeployFunction = async () => {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Update frontend", contractDir);
    }

    if (!fs.existsSync(contractDir)) {
        fs.mkdirSync(contractDir);
    }

    await updateContractAddresses();
    await updateABI();
};

const updateABI = async () => {
    const Lottery = artifacts.readArtifactSync("Lottery");

    fs.writeFileSync(FRONTEND_LOCATION_ABI_FILE, JSON.stringify(Lottery, null, 2));
};

const updateContractAddresses = async () => {
    const lottery = await ethers.getContract("Lottery");
    const chainId = network.config.chainId?.toString()!;

    if (!fs.existsSync(FRONTEND_LOCATION_ADDRESSES_FILE)) {
        fs.writeFileSync(
            FRONTEND_LOCATION_ADDRESSES_FILE,
            JSON.stringify({
                [chainId]: [lottery.address],
            })
        );
    } else {
        const currentAddresses: ICurrentAddresses = JSON.parse(
            fs.readFileSync(FRONTEND_LOCATION_ADDRESSES_FILE, "utf8")
        );

        if (chainId in currentAddresses) {
            if (!currentAddresses[chainId].includes(lottery.address)) {
                currentAddresses[chainId].push(lottery.address);
            }
        } else {
            currentAddresses[chainId] = [lottery.address];
        }

        fs.writeFileSync(FRONTEND_LOCATION_ADDRESSES_FILE, JSON.stringify(currentAddresses));
    }
};
export default deployFunc;
deployFunc.tags = ["all", "frontend"];
