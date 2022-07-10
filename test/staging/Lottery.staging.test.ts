import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumberish } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { Lottery } from "../../typechain";

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
          let lottery: Lottery;
          let entranceFee: BigNumberish;
          let deployer;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);
              entranceFee = await lottery.getEntranceFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with chainLink keepers and VRF, and picks a random winner", async () => {
                  const startTime = await lottery.getLastTimeStamp();
                  const accounts = await ethers.getSigners();
                  const deployerSignerAccount: SignerWithAddress = accounts[0];

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("Winner Picked event fired!");
                          try {
                              const recentWinner = await lottery.getRecentWinner();
                              console.log("The winner is : ", recentWinner);
                              const lotteryState = await lottery.getLotteryState();
                              const winnerEndingBalance = await deployerSignerAccount.getBalance();
                              const endingTimeStamp = await lottery.getLastTimeStamp();

                              await expect(lottery.getPlayer(0)).to.be.reverted;
                              assert.equal(lotteryState.toString(), "0");
                              assert.equal(
                                  recentWinner.toLowerCase(),
                                  deployerSignerAccount.address.toLowerCase()
                              );
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(entranceFee).toString()
                              );

                              assert.equal(endingTimeStamp > startTime);
                          } catch (error) {
                              reject(error);
                          }

                          resolve(1);
                      });

                      await lottery.enterLottery({ value: entranceFee });
                      const winnerStartingBalance = await deployerSignerAccount.getBalance();
                  });
              });
          });
      });
