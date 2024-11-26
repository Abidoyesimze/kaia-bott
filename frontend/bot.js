// nft-bot.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { ethers } = require('ethers');
const { BotContract } = require('./index');
const CryptoJS = require('crypto-js');

class NFTBot {
    constructor() {
        // Initialize Express server
        this.app = express();
        this.port = process.env.PORT || 3000; // Default port is 3000 if not specified in the environment
        // Initialize Telegram Bot
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        
        // Initialize Web3 and Contract
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.contract = new ethers.Contract(
            BotContract.address,
            BotContract.abi,
            this.provider
        );

        
       

        // Store user sessions and group data
        this.userSessions = new Map();
        this.groupInviteLinks = new Map();
        
        this.setupCommands();
        this.setupGroupManagement();
    }

    

    async validateNFTOwnership(userId) {
        const userSession = this.userSessions.get(userId);
        if (!userSession) return false;

        const wallet = userSession.wallet;
        const balance = await this.contract.balanceOf(wallet.address);
        return balance > 0;
    }

    async generateGroupInvite(chatId) {
        try {
            // Create one-time invite link that expires in 5 minutes
            const invite = await this.bot.createChatInviteLink(chatId, {
                member_limit: 1,
                expire_date: Math.floor(Date.now() / 1000) + 300
            });
            return invite.invite_link;
        } catch (error) {
            console.error('Error generating invite:', error);
            throw error;
        }
    }

    setupGroupManagement() {
        // Monitor new members joining the group
        this.bot.on('new_chat_members', async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.new_chat_member.id;
            
            // Skip if the new member is the bot itself
            if (userId === this.bot.botId) return;

            try {
                const hasNFT = await this.validateNFTOwnership(userId);
                if (!hasNFT) {
                    // Send warning to admins
                    await this.bot.sendMessage(chatId,
                        `⚠️ Warning: User ${msg.new_chat_member.first_name} doesn't own the required NFT.`
                    );
                    
                    // Optional: Kick user
                    if (process.env.AUTO_KICK === 'true') {
                        await this.bot.kickChatMember(chatId, userId);
                        await this.bot.unbanChatMember(chatId, userId); // Immediately unban so they can rejoin later
                    }
                }
            } catch (error) {
                console.error('Error handling new member:', error);
            }
        });

        // Periodically check existing members
        setInterval(async () => {
            try {
                const chatId = process.env.GROUP_CHAT_ID;
                const members = await this.bot.getChatAdministrators(chatId);
                
                for (const member of members) {
                    if (member.status === 'creator' || member.status === 'administrator') continue;
                    
                    const hasNFT = await this.validateNFTOwnership(member.user.id);
                    if (!hasNFT) {
                        await this.bot.sendMessage(chatId,
                            `⚠️ User ${member.user.first_name} no longer owns the required NFT.`
                        );
                    }
                }
            } catch (error) {
                console.error('Error in periodic check:', error);
            }
        }, 3600000); // Check every hour
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            await this.bot.sendMessage(chatId, 
                'Welcome to the NFT Minting Bot! 🚀\n\n' +
                'Commands:\n' +
                '/connect - Connect your wallet\n' +
                '/import - Import your existing wallet (private key or mnemonic)\n' +
                '/mint - Mint a new NFT\n' +
                '/balance - Check your NFT balance\n' +
                '/collection - View your NFT collection'
            );
        });

        // Connect wallet command
        this.bot.onText(/\/connect/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                if (!this.userSessions.has(userId)) {
                    const wallet = ethers.Wallet.createRandom().connect(this.provider);
                    this.userSessions.set(userId, { wallet });

                    await this.bot.sendMessage(chatId,
                        '🔐 New wallet created!\n\n' +
                        `Address: ${wallet.address}\n\n` +
                        'IMPORTANT: Save this private key securely:\n' +
                        `${wallet.privateKey}\n\n` +
                        '⚠️ Never share your private key with anyone!\n\n' +
                        '💡 Send some ETH to this address to pay for minting gas fees.'
                    );
                } else {
                    const wallet = this.userSessions.get(userId).wallet;
                    await this.bot.sendMessage(chatId,
                        '🔗 Wallet already connected!\n\n' +
                        `Address: ${wallet.address}`
                    );
                }
            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Error connecting wallet: ' + error.message);
            }
        });

        // Import wallet command
        this.bot.onText(/\/import/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            // First, check if it's a private message
            const chat = await this.bot.getChat(chatId);
            if (chat.type !== 'private') {
                await this.bot.sendMessage(chatId, 
                    '⚠️ For security reasons, please use the /import command in a private message with the bot.'
                );
                return;
            }

            const message = 'To import your wallet, send your private key or mnemonic (12 words) in the next message.';
            await this.bot.sendMessage(chatId, message);
            
            // Listen for the private key or mnemonic
            this.bot.once('message', async (msg) => {
                const input = msg.text.trim();
                let wallet;

                try {
                    if (input.split(' ').length === 12) {
                        wallet = ethers.Wallet.fromMnemonic(input).connect(this.provider);
                    } else if (input.startsWith('0x')) {
                        wallet = new ethers.Wallet(input).connect(this.provider);
                    } else {
                        await this.bot.sendMessage(chatId, '❌ Invalid input. Please provide a valid private key or mnemonic.');
                        return;
                    }

                    const encryptedPrivateKey = CryptoJS.AES.encrypt(wallet.privateKey, process.env.SECRET_KEY).toString();
                    this.userSessions.set(userId, { wallet, encryptedPrivateKey });

                    await this.bot.sendMessage(chatId,
                        '🔐 Wallet imported successfully!\n\n' +
                        `Address: ${wallet.address}\n\n` +
                        'Your wallet is now connected and ready for use.'
                    );

                } catch (error) {
                    await this.bot.sendMessage(chatId, '❌ Error importing wallet: ' + error.message);
                }
            });
        });

        // Mint NFT command
        this.bot.onText(/\/mint/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                if (!this.userSessions.has(userId)) {
                    await this.bot.sendMessage(chatId, '❌ Please connect or import your wallet first using /connect or /import');
                    return;
                }

                const wallet = this.userSessions.get(userId).wallet;
                const contractWithSigner = this.contract.connect(wallet);

                await this.bot.sendMessage(chatId, '🔄 Preparing to mint your NFT... Please wait.');

                try {
                    // Estimate gas and add 20% buffer
                    const gasEstimate = await contractWithSigner.mint.estimateGas(wallet.address);
                    const gasLimit = BigInt(Math.floor(Number(gasEstimate) * 1.2));
                    
                    const tx = await contractWithSigner.mint(wallet.address, { gasLimit });
                    await this.bot.sendMessage(chatId, '🔄 Transaction submitted! Waiting for confirmation...');

                    const receipt = await tx.wait();
                    
                    // Generate group invite after successful mint
                    const inviteLink = await this.generateGroupInvite(process.env.GROUP_CHAT_ID);

                    await this.bot.sendMessage(chatId,
                        '✅ NFT Minted Successfully!\n\n' +
                        `Transaction: ${tx.hash}\n\n` +
                        `🎉 Join our exclusive group:\n${inviteLink}\n\n` +
                        '⚠️ This invite link will expire in 5 minutes!'
                    );

                } catch (error) {
                    if (error.message.includes('Must wait 24 hours')) {
                        await this.bot.sendMessage(chatId, '❌ You must wait 24 hours between mints.');
                    } else if (error.message.includes('insufficient funds')) {
                        await this.bot.sendMessage(chatId, '❌ Insufficient funds for gas fees.');
                    } else {
                        await this.bot.sendMessage(chatId, '❌ Error minting NFT: ' + error.message);
                    }
                }

            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ An error occurred: ' + error.message);
            }
        });

        // Balance command
        this.bot.onText(/\/balance/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                if (!this.userSessions.has(userId)) {
                    await this.bot.sendMessage(chatId, '❌ Please connect your wallet first using /connect');
                    return;
                }

                const wallet = this.userSessions.get(userId).wallet;
                
                // Get NFT balance
                const nftBalance = await this.contract.balanceOf(wallet.address);
                
                // Get ETH balance
                const ethBalance = await this.provider.getBalance(wallet.address);
                const ethBalanceFormatted = ethers.formatEther(ethBalance);

                await this.bot.sendMessage(chatId,
                    `💰 Wallet Balance:\n\n` +
                    `NFTs: ${nftBalance.toString()}\n` +
                    `ETH: ${ethBalanceFormatted}`
                );

            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Error checking balance: ' + error.message);
            }
        });

        // Collection command
        this.bot.onText(/\/collection/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                if (!this.userSessions.has(userId)) {
                    await this.bot.sendMessage(chatId, '❌ Please connect your wallet first using /connect');
                    return;
                }

                const wallet = this.userSessions.get(userId).wallet;
                const filter = this.contract.filters.Transfer(null, wallet.address);
                const events = await this.contract.queryFilter(filter);

                if (events.length === 0) {
                    await this.bot.sendMessage(chatId, '🖼️ You don\'t have any NFTs yet. Use /mint to get your first one!');
                    return;
                }

                let message = '🖼️ Your NFT Collection:\n\n';
                for (const event of events) {
                    const tokenId = event.args.tokenId.toString();
                    const tokenURI = await this.contract.tokenURI(tokenId);
                    message += `NFT #${tokenId}\nMetadata: ${tokenURI}\n\n`;
                }

                await this.bot.sendMessage(chatId, message);

            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Error fetching collection: ' + error.message);
            }
        });
    }
}

// Initialize the bot
const bot = new NFTBot();