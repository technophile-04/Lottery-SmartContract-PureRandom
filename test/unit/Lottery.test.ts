import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import assert from "assert";
import { expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat.config";
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", async () => {
          let lottery: Lottery;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let deployer: string;
          const { chainId } = network.config;
          let interval: string;
          beforeEach(async () => {
              await deployments.fixture(["all"]);
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              interval = (await lottery.getInterval()).toString();
          });

          describe("constructor", () => {
              it("Initializes the lottery with correct state", async () => {
                  const currentState = await lottery.getLotteryState();
                  assert.strictEqual(currentState.toString(), "0");
              });

              it("Initialize with correct interval", async () => {
                  const interval = await lottery.getInterval();
                  assert.strictEqual(interval.toString(), networkConfig[chainId!]["interval"]);
              });

              it("Initialize the lottery with correct entrance fee", async () => {
                  const entranceFee = await lottery.getEntranceFee();
                  assert.strictEqual(
                      entranceFee.toString(),
                      networkConfig[chainId!]["entranceFee"].toString()
                  );
              });
          });

          describe("enterLottery", () => {
              it("Revert if we don't pay enough entrance fee", async () => {
                  await expect(
                      lottery.enterLottery({ value: ethers.utils.parseEther("0.001") })
                  ).to.be.revertedWith("Lottery__NotEnoughETHEntered");
              });

              it("Add player to the lottery", async () => {
                  const txnRes = await lottery.enterLottery({
                      value: ethers.utils.parseEther("0.02"),
                  });
                  await txnRes.wait();
                  const enteredPlayer = await lottery.getPlayer("0");
                  assert.strictEqual(enteredPlayer, deployer);
              });

              it("Emits an event when player enters the lottery", async () => {
                  await expect(
                      lottery.enterLottery({ value: ethers.utils.parseEther("0.02") })
                  ).to.emit(lottery, "LotteryEnter");
              });

              it("Revert when lottery is in calculating state", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.02") });

                  /* 
                    1)Make conditions for checkUpKeep 
                        a)isTimePassed
                        b)hasPlayer
                        c)hasBalance
                */

                  // a)isTimePassed
                  await network.provider.send("evm_increaseTime", [parseInt(interval, 10) + 1]);
                  await network.provider.send("evm_mine", []);

                  // b)hasPlayer -Already true
                  // c)hasBalance - Already true
                  // d)isOpen - Already true

                  //   Mimicking chainLink keeper
                  await lottery.performUpkeep([]);

                  await expect(
                      lottery.enterLottery({ value: ethers.utils.parseEther("0.10") })
                  ).to.be.revertedWith("Lottery__NotOpen");
              });
          });

          describe("checkUpKeep", () => {
              it("Return false if no player have sends ETH", async () => {
                  //make isTimePassed true
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
                  await network.provider.send("evm_mine", []);

                  //Here we are simulating the checkUpKeep for its result
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

                  assert.strictEqual(upkeepNeeded, false);
              });

              it("Returns false if lottery isn't open", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.2") });
                  await lottery.performUpkeep([]);

                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.strictEqual(upkeepNeeded, false);
              });

              it("Returns false if enough time isn't passed", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) - 2]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.2") });

                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.strictEqual(upkeepNeeded, false);
              });

              it("Returns false if enough time isn't passed", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) - 2]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.2") });

                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.strictEqual(upkeepNeeded, false);
              });

              it("Return true if enought time passed, state is open, have players", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.2") });

                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.strictEqual(upkeepNeeded, true);
              });
          });

          describe("performUpkeep", () => {
              it("Revert when checkUpKeep is false", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpKeepNotNeeded"
                  );
              });

              it("Set lottery state to calculating", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 2]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.02") });

                  await lottery.performUpkeep([]);

                  const lotteryState = await lottery.getLotteryState();

                  assert(lotteryState.toString(), "1");
              });

              it("Should emit an event with requestId", async () => {
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 2]);
                  await network.provider.send("evm_mine", []);
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.02") });

                  const txnRes = await lottery.performUpkeep([]);
                  const txnReceipt = await txnRes.wait(1);
                  const requestId = txnReceipt.events![1]?.args?.requestId;
                  assert(requestId > 0);
              });
          });

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("0.2") });
                  await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
                  await network.provider.send("evm_mine", []);
              });

              it("Can be only called after performUpKeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("picks the winner, resets the lottery, and sends money", async () => {
                  const additionalEntrant = 3;
                  const startingAccount = 1;
                  const lotteryEntranceFee = ethers.utils.parseEther("0.2");
                  const accounts = await ethers.getSigners();
                  for (let i = startingAccount; i < startingAccount + additionalEntrant; i++) {
                      const accountConnectedLottery = lottery.connect(accounts[i]);
                      await accountConnectedLottery.enterLottery({
                          value: lotteryEntranceFee,
                      });
                  }

                  const startingTimeStamp = await lottery.getLastTimeStamp();

                  // performUpKeep (mock being chainLink keeper)
                  // fullFillRandomWords(mock being  chainLink VRF)

                  await new Promise<void>(async (resolve, reject) => {
                      // Listen for event and wait for it
                      lottery.once("WinnerPicked", async () => {
                          console.log("Winner Found");
                          try {
                              const recentWinner = await lottery.getRecentWinner();
                              console.log("RecentWinner is :", recentWinner);
                              /*console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[2].address);
                              console.log(accounts[3].address); */
                              const winnerEndingBalance = await accounts[1].getBalance();

                              const lotteryState = await lottery.getLotteryState();
                              const lastTimeStamp = await lottery.getLastTimeStamp();
                              const numPlayers = await lottery.getNumberOfPlayers();
                              assert.strictEqual(numPlayers.toString(), "0");
                              assert.strictEqual(lotteryState.toString(), "0");
                              assert(lastTimeStamp > startingTimeStamp);

                              assert.strictEqual(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          lotteryEntranceFee
                                              .mul(additionalEntrant)
                                              .add(lotteryEntranceFee)
                                      )
                                      .toString()
                              );
                          } catch (error) {
                              reject(error);
                          }
                          resolve();
                      });

                      // call performUpKeep which will pass throw an event wit requestId(mocking keeper)
                      const txnResponse = await lottery.performUpkeep([]);
                      const txnReceipt = await txnResponse.wait(1);
                      const reqId = txnReceipt.events![1]?.args?.requestId;
                      const winnerStartingBalance = await accounts[1].getBalance();

                      // call fullFillRandomWards as VRF with requestId and subscriptionContract.
                      await vrfCoordinatorV2Mock.fulfillRandomWords(reqId, lottery.address);
                  });
              });
          });
      });
