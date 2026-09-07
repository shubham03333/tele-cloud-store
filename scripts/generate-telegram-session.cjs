const { createInterface } = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH ?? "";

if (!Number.isInteger(apiId) || apiId <= 0 || apiHash.length < 8) {
  console.error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first (from https://my.telegram.org).");
  process.exit(1);
}

async function main() {
  const rl = createInterface({ input, output });
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => rl.question("Phone number (with country code, e.g. +91...): "),
    phoneCode: async () => rl.question("Login code from Telegram: "),
    password: async () => rl.question("Cloud password / 2FA (press Enter if none): "),
    onError: (error) => console.error(error),
  });

  const session = client.session.save();
  await client.disconnect();
  rl.close();
  // ok

  console.log("\nString session (keep private, paste only into Nimbus Drive Settings):\n");
  console.log(session);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
