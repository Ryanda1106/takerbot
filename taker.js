import axios from 'axios';
import { ethers } from 'ethers';
import fs from 'fs';
import log from './logger.js';
import transaction from './contract.js';


function readWallets() {
    if (fs.existsSync("privateKeys.json")) {
        const data = fs.readFileSync("privateKeys.json");
        const privateKeys = JSON.parse(data);

        if (!Array.isArray(privateKeys) || privateKeys.length === 0) {
            log.error("Invalid or empty privateKeys.json. Exiting...");
            process.exit(1);
        }

        return privateKeys.map((privateKey) => ({
            privateKey,
            address: new ethers.Wallet(privateKey).address,
        }));
    } else {
        log.error("No private keys found in privateKeys.json. Exiting...");
        process.exit(1);
    }
}
function header() {
  process.stdout.write('\x1Bc');
  console.log('====================================================');
  console.log('                                                    ');
  console.log(' 8888888b.  d8b                        888          ');
  console.log(' 888   Y88b Y8P                        888          ');
  console.log(' 888    888                            888          ');
  console.log(' 888   d88P 888  8888b.  88888b.   .d88888  8888b.  ');
  console.log(' 8888888P"  888     "88b 888 "88b d88" 888     "88b ');
  console.log(' 888 T88b   888 .d888888 888  888 888  888 .d888888 ');
  console.log(' 888  T88b  888 888  888 888  888 Y88b 888 888  888 ');
  console.log(' 888   T88b 888 "Y888888 888  888  "Y88888 "Y888888 ');
  console.log('                                                    ');
  console.log('====================================================');
  console.log();
}
const API = 'https://lightmining-api.taker.xyz/';
const axiosInstance = axios.create({
    baseURL: API,
});

const get = async (url, token) => {
    return await axiosInstance.get(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

const post = async (url, data, config = {}) => {
    return await axiosInstance.post(url, data, config);
};

const sleep = (s) => {
    return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

async function signMessage(message, privateKey) {
    const wallet = new ethers.Wallet(privateKey);
    try {
        const signature = await wallet.signMessage(message);
        return signature;
    } catch (error) {
        log.error("Error signing message:", error);
        return null;
    }
}

const getUser = async (token, retries = 3) => {
    try {
        const response = await get('user/getUserInfo', token);
        return response.data;
    }
    catch (error) {
        if (retries > 0) {
            log.error("Failed to get user data:", error.message);
            log.warn(`Retrying... (${retries - 1} attempts left)`);
            await sleep(3);
            return await getUser(token, retries - 1);
        } else {
            log.error("Failed to get user data after retries:", error.message);
            return null;
        }
    }
};
const getNonce = async (walletAddress, retries = 3) => {
    try {
        const res = await post(`wallet/generateNonce`, { walletAddress });
        return res.data;
    } catch (error) {
        if (retries > 0) {
            log.error("Failed to get nonce:", error.message);
            log.warn(`Retrying... (${retries - 1} attempts left)`);
            await sleep(3);
            return await getNonce(walletAddress, retries - 1);
        } else {
            log.error("Failed to get nonce after retries:", error.message);
            return null;
        }

    }
};

const login = async (address, message, signature, retries = 3) => {
    try {
        const res = await post(`wallet/login`, {
            address,
            invitationCode: "BKX7Y",
            message,
            signature,
        });
        return res.data.data;
    } catch (error) {
        if (retries > 0) {
            log.error("Failed to login:", error.message);
            log.warn(`Retrying... (${retries - 1} attempts left)`);
            await sleep(3);
            return await login(address, message, signature, retries - 1);
        } else {
            log.error("Failed to login after retries:", error.message);
            return null;
        }
    }
};

const getMinerStatus = async (token, retries = 3) => {
    try {
        const response = await get('assignment/totalMiningTime', token);
        return response.data;
    }
    catch (error) {
        if (retries > 0) {
            log.error("Failed to get user mine data:", error.message);
            log.warn(`Retrying... (${retries - 1} attempts left)`);
            await sleep(3);
            return await getUser(token, retries - 1);
        } else {
            log.error("Failed to get user mine data after retries:", error.message);
            return null;
        }
    }
};

const startMine = async (token, retries = 3) => {
    try {
        const res = await post(
            `assignment/startMining`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error) {
        if (retries > 0) {
            log.error("Failed to start mining:", error.message);
            log.warn(`Retrying... (${retries - 1} attempts left)`);
            await sleep(3);
            return await startMine(token, retries - 1);
        } else {
            log.error("Failed to start mining after retries:", error.message);
            return null;
        }
    }
};

const main = async () => {
	header();
    const wallets = readWallets();
    if (wallets.length === 0) {
        log.error('', "No wallets found in wallets.json file - exiting program.");
        process.exit(1);
    }
        for (const wallet of wallets) {
			log.warn('', ` === Sever is down bot might be slow - Just be patient ===`);
			log.info(`Start process for wallet ${wallet.address}`);
            const nonceData = await getNonce(wallet.address);
            if (!nonceData || !nonceData.data || !nonceData.data.nonce) {
                log.error(`Failed to retrieve nonce for wallet: ${wallet.address}`);
                continue;
            }

            const nonce = nonceData.data.nonce;
            const signature = await signMessage(nonce, wallet.privateKey);
            if (!signature) {
                log.error(`Failed to sign message for wallet: ${wallet.address}`);
                continue;
            }
            log.info(`Trying To Login for wallet: ${wallet.address}`);
            const loginResponse = await login(wallet.address, nonce, signature);
            if (!loginResponse || !loginResponse.token) {
                log.error(`Login failed for wallet: ${wallet.address}`);
                continue;
            } else {
                log.info(`Login successful...`);
            }

            log.info(`Trying to check user info...`);
            const userData = await getUser(loginResponse.token);
            if (userData && userData.data) {
                const { userId, twName, totalReward } = userData.data;
				const cleanTotalReward = Number(totalReward).toString();
			log.info(`User ID: ${userId} | Twitter: @${twName} | Total Points: ${cleanTotalReward}`);
                if (!twName) {
                    log.error('', `This wallet (${wallet.address}) is not bound Twitter/X skipping...`);
                    continue;
                }
            } else {
                log.error(`Failed to get user data for wallet: ${wallet.address}`);
            }

            log.info('Trying to check user miner status...')
            const minerStatus = await getMinerStatus(loginResponse.token);
            if (minerStatus && minerStatus.data) {
                const lastMiningTime = minerStatus.data?.lastMiningTime || 0;
                const nextMiningTime = lastMiningTime + 24 * 60 * 60;
                const nextDate = new Date(nextMiningTime * 1000);
                const dateNow = new Date();

                log.info(`Last mining time:`, new Date(lastMiningTime * 1000).toLocaleString());
                if (dateNow > nextDate) {
                    log.info(`Trying to start Mining for wallet: ${wallet.address}`);
                    const mineResponse = await startMine(loginResponse.token);
                    log.info('Mine response:', mineResponse)
                    if (mineResponse) {
                        log.info(`Trying to activate mining on-chain for wallet: ${wallet.address}`);
                        const isMiningSuccess = await transaction(wallet.privateKey)
                        if (!isMiningSuccess) {
                            log.error(`Wallet already start mine today or wallet dont have taker balance`);
                        }
                    } else {
                        log.error(`Failed to start mining for wallet: ${wallet.address}`);
                    }
                } else {
                    log.warn(`Mining already started, next mining time is:`, nextDate.toLocaleString());
                }
            }
        }
};

main();
