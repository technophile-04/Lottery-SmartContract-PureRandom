import { BigNumberish, ethers } from "ethers";

export interface networkConfigItem {
    blockConfirmations?: number;
    VRFCoordinatorV2: string;
    entranceFee: BigNumberish;
    gasLane: string;
    callBackGasLimit: string;
    interval: string;
    subscriptionId?: string;
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem;
}

const networkConfig: networkConfigInfo = {
    4: {
        blockConfirmations: 6,
        VRFCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callBackGasLimit: "500000",
        interval: "120",
        // subscriptionId: "4040",
        subscriptionId: "8436",
    },
    31337: {
        blockConfirmations: 1,
        entranceFee: ethers.utils.parseEther("0.01"),
        VRFCoordinatorV2: "0x0000",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callBackGasLimit: "500000",
        interval: "30",
    },
};

const developmentChains = ["hardhat", "localhost"];

export { networkConfig, developmentChains };
