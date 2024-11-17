require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
const { BotContract } = require('./index');
const CryptoJS = require('crypto-js');

class NFTBot {
    constructor() {
        // Initialize Telegram Bot
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        
        // Initialize Web3 and Contract
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.contract = new ethers.Contract(
            BotContract.address,
            BotContract.abi,
            this.provider
        );

        // Store user sessions
        this.userSessions = new Map();

        this.setupCommands();
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
                        '⚠️ Never share your private key with anyone!'
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
            const message = 'To import your wallet, send your private key or mnemonic (12 words) in the next message.\n⚠️ Be sure to only use this command in private chats!';

            await this.bot.sendMessage(chatId, message);
            
            // Listen for the private key or mnemonic
            this.bot.once('message', async (msg) => {
                const input = msg.text.trim();
                let wallet;

                try {
                    if (input.split(' ').length === 12) {
                        // If it's a mnemonic
                        wallet = ethers.Wallet.fromMnemonic(input).connect(this.provider);
                    } else if (input.startsWith('0x')) {
                        // If it's a private key
                        wallet = new ethers.Wallet(input).connect(this.provider);
                    } else {
                        await this.bot.sendMessage(chatId, '❌ Invalid input. Please provide a valid private key or mnemonic.');
                        return;
                    }

                    // Encrypt the private key before storing it securely
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

                // Send minting confirmation message
                await this.bot.sendMessage(chatId, '🔄 Preparing to mint your NFT... Please wait.');

                try {
                    // Estimate gas
                    const gasEstimate = await contractWithSigner.mint.estimateGas(wallet.address);
                    const gasLimit = BigInt(Math.floor(Number(gasEstimate) * 1.2));
                    const tx = await contractWithSigner.mint(wallet.address, { gasLimit });

                    await this.bot.sendMessage(chatId, '🔄 Transaction submitted! Waiting for confirmation...');

                    // Wait for transaction confirmation
                    const receipt = await tx.wait();
                    const transferEvent = receipt.logs.find(log => log.topics[0] === ethers.id("Transfer(address,address,uint256)"));
                    const tokenId = transferEvent ? ethers.BigNumber.from(transferEvent.data).toString() : 'Unknown';

                    await this.bot.sendMessage(chatId,
                        '✅ NFT Minted Successfully!\n\n' +
                        `Token ID: ${tokenId}\n` +
                        `Transaction: ${tx.hash}\n\n` +
                        'View your collection with /collection'
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

        // Check balance command
        this.bot.onText(/\/balance/, async (msg) => {
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
                const balance = events.length;

                await this.bot.sendMessage(chatId, `💰 You own ${balance} NFT(s).`);

            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Error checking balance: ' + error.message);
            }
        });

        // View collection command
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
