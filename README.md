# 🤖 NFT Telegram Bot

A powerful Telegram bot that enables users to mint, manage, and verify NFT ownership while providing exclusive access to token-gated communities.

## 📋 Table of Contents
- [Features](#features)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commands](#commands)
- [Security](#security)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Wallet Management
- Create new Ethereum wallets
- Import existing wallets via private key or mnemonic
- Secure wallet storage with encryption
- Real-time balance checking

### NFT Operations
- Mint new NFTs directly through Telegram
- View NFT collection and metadata
- Check NFT ownership status
- Automatic gas estimation with buffer

### Community Management
- Token-gated group access
- Automatic member verification
- One-time expiring invite links
- Periodic NFT ownership verification
- Automated non-holder removal

## 🏗 System Architecture
- Built with Node.js
- Utilizes ethers.js for Web3 functionality
- Integrates with Telegram Bot API
- Implements secure session management
- Uses CryptoJS for encryption

## 🔧 Prerequisites
- Node.js 14.0 or higher
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Ethereum RPC URL (e.g., kaia rpc url)
- Smart Contract deployment

## 🚀 Installation

1. Clone the repository
```bash
git clone https://github.com/Abidoyesimze/kaia-bott.git
cd nft-telegram-bot
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

## ⚙️ Configuration

Create a `.env` file with the following variables:
```env
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GROUP_CHAT_ID=your_group_chat_id
AUTO_KICK=true

# Blockchain Configuration
RPC_URL=your_ethereum_rpc_url
SECRET_KEY=your_encryption_secret

# Contract Configuration
CONTRACT_ADDRESS=your_contract_address
```

## 📱 Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize the bot and view available commands | `/start` |
| `/connect` | Create a new Ethereum wallet | `/connect` |
| `/import` | Import existing wallet (private chat only) | `/import` |
| `/mint` | Mint a new NFT | `/mint` |
| `/balance` | Check ETH and NFT balances | `/balance` |
| `/collection` | View owned NFTs and metadata | `/collection` |

## 🔐 Security Features

### Wallet Protection
- Private key encryption using CryptoJS
- Secure wallet import in private chats only
- Session-based wallet management
- No storage of raw private keys

### Group Security
- One-time use invite links
- 5-minute invite link expiration
- Automated NFT ownership verification
- Optional automatic removal of non-holders

### Best Practices
- Gas estimation with safety buffer
- Error handling for all blockchain operations
- Rate limiting for mint operations
- Secure session management

## 💻 Development

### Project Structure
```
nft-telegram-bot/
├── nft-bot.js
├── index.js
├── package.json
├── .env
└── contracts/
    └── BotContract.json
```

### Running the Bot
```bash
# Development
npm run dev

# Production
npm start
```

### Error Handling
The bot implements comprehensive error handling for:
- Insufficient funds
- Failed transactions
- Network issues
- Invalid wallet imports
- Unauthorized access attempts

## 🚧 Known Limitations
- One wallet per user
- 24-hour cooldown between mints
- Group invite links expire in 5 minutes
- Must be group admin to manage settings

## ⚠️ Disclaimer

This bot handles cryptocurrency operations. Always verify transactions and never share private keys. The developers are not responsible for lost funds or compromised wallets due to user error.
