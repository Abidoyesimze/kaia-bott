import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const BotModule = buildModule("Bot", (m) => {

  const bot = m.contract("TelegramNFT", );

  return { bot };
});

export default BotModule;
