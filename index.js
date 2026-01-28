require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");

const express = require("express");

/* ================= KEEP ALIVE ================= */
const app = express();
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌐 Keep-alive server running");
});
/* ============================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* ===== CONFIG ===== */
const PREFIX = "!";
const BUY_CHANNEL_ID = "1076823487852859432";
const SUPPORT_CHANNEL_ID = "1192380390086823976";
const BID_ROLE_ID = "1076385318229512230";
const LIEN_QUAN_LINK = "https://discord.gg/dUkpZfDz5A";
const COUNTDOWN_TIME = 8000;

/* ===== AUCTION STATE ===== */
let auction = {
  active: false,
  item: "",
  price: 0,
  bidder: null,
  count: 1,
  timeout: null,
  channel: null
};

/* ===== READY ===== */
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

/* ===== MESSAGE ===== */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  /* ===== !menu (ADMIN ONLY) ===== */
  if (cmd === "menu") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Chỉ **Admin** mới dùng được lệnh này.");

    const embed = new EmbedBuilder()
      .setColor("#7CFF00")
      .setTitle("🛒 MENU SHOP BẤT ỔN")
      .setDescription(
        "📌 **Cách xem bảng giá**\n" +
        "👉 Chọn dịch vụ trong menu bên dưới để xem chi tiết\n\n" +
        "📦 **Mua hàng & hỗ trợ**\n" +
        `🛒 Mua hàng: <#${BUY_CHANNEL_ID}>\n` +
        `🛠️ Hỗ trợ: <#${SUPPORT_CHANNEL_ID}>\n\n` +
        "👤 **DEV BY ZOOD**"
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId("shop_menu")
      .setPlaceholder("Chọn dịch vụ bạn cần")
      .addOptions([
        { label: "Shop Acc Liên Quân", value: "lq", emoji: "🎮" },
        { label: "Shop Acc Free Fire", value: "ff", emoji: "🔥" },
        { label: "Tài khoản Premium", value: "discord", emoji: "🧩" },
        { label: "Tạo bot theo nhu cầu", value: "bot", emoji: "🤖" },
        { label: "Dịch vụ Discord", value: "server", emoji: "🏗️" },
        { label: "Nạp Quân Huy", value: "quanhuy", emoji: "💎" },
        { label: "Khác", value: "other", emoji: "📌" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* ===== !daugia (ADMIN ONLY) ===== */
  if (cmd === "daugia") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Chỉ **Admin** mới được tạo đấu giá.");

    if (auction.active)
      return message.reply("⚠️ Đang có phiên đấu giá.");

    auction.channel = message.channel;

    await message.channel.send("📦 **Mặt hàng gì?**");
    const itemMsg = await message.channel.awaitMessages({
      max: 1,
      time: 60000,
      filter: m => m.author.id === message.author.id
    });
    auction.item = itemMsg.first().content;

    await message.channel.send("💰 **Giá khởi điểm?**");
    const priceMsg = await message.channel.awaitMessages({
      max: 1,
      time: 60000,
      filter: m => m.author.id === message.author.id
    });
    auction.price = parseInt(priceMsg.first().content);

    auction.bidder = null;
    auction.count = 1;
    auction.active = true;

    startCountdown();
  }

  /* ===== !buy <giá> ===== */
  if (cmd === "buy") {
    if (!auction.active) return;

    if (!message.member.roles.cache.has(BID_ROLE_ID))
      return message.reply("❌ Bạn không có quyền trả giá.");

    const bid = parseInt(args[0]);
    if (isNaN(bid) || bid <= auction.price)
      return message.reply("❌ Giá phải cao hơn giá hiện tại.");

    auction.price = bid;
    auction.bidder = message.author;
    auction.count = 1;
    clearTimeout(auction.timeout);

    startCountdown();
  }
});

/* ===== MENU INTERACTION ===== */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "shop_menu") return;

  // ⚠️ BẮT BUỘC deferReply để tránh Interaction failed
  await interaction.deferReply({ ephemeral: true });

  let reply = "";

  switch (interaction.values[0]) {
    case "lq":
      reply =
        "🎮 **SHOP ACC LIÊN QUÂN**\n" +
        "• Acc random – giá rẻ\n" +
        "• Acc Liên Quân\n" +
        `👉 **Vào shop:** https://discord.gg/dUkpZfDz5A`;
      break;

    case "ff":
      reply =
        "🔥 **SHOP ACC FREE FIRE**\n" +
        "👉 -Coming soon-";
      break;

    case "discord":
      reply =
        "🧩 **TÀI KHOẢN PREMIUM**\n" +
        "> Netflix riêng tư:\n• Netflix 1 tháng: 80k\n> Youtube Premium:\n• Youtube Premium 1 tháng: 30k\n> Spotify Premium Cá nhân:\n• Spotify Premium 1 tháng: 50k\n• Spotify Premium 6 tháng: 270k\n• Spotify Premium 12 tháng: 450k";
      break;

    case "bot":
      reply =
        "🤖 **TẠO BOT DISCORD**\n" +
        "👉 -Coming soon-";
      break;

    case "server":
      reply =
        "🏗️ **DỊCH VỤ DISCORD**\n" +
        "> Nicho Trial => Đối với tài khoản tạo trên 1 tháng, chưa dùng nicho lần nào hoặc không dùng nicho trong 12 tháng:\n• Nicho Trial 3 tháng: 80k\n> Còn các dịch vụ Nicho Boost, Boost Server, Decor Discord vui lòng nhắn tin cho <@1076385318263062609> hoặc tạo ticket tại <#1076823487852859432> để biết thêm chi tiết";
      break;

    case "quanhuy":
      reply =
        "💎 **NẠP QUÂN HUY**\n" +
        "Liên hệ <@1076385318263062609> hoặc tạo ticket tại <#1076823487852859432> để nạp với giá ưu đãi";
      break;

    case "other":
      reply =
        "📌 **DỊCH VỤ KHÁC**\n" +
        "Ngoài ra nếu bạn có nhu cầu tìm kiếm dịch vụ hay account gì cũng có thể order tại shop";
      break;
  }

  await interaction.editReply({ content: reply });
});

/* ===== AUCTION COUNTDOWN ===== */
function startCountdown() {
  const channel = auction.channel;

  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("🔨 PHIÊN ĐẤU GIÁ")
    .setDescription(
      `📦 **Mặt hàng:** ${auction.item}\n` +
      `💰 **Giá hiện tại:** ${auction.price}\n` +
      `👤 **Người trả giá:** ${auction.bidder ?? "Chưa có"}\n\n` +
      `⏱️ **${auction.price} lần ${auction.count}**`
    );

  channel.send({ embeds: [embed] });

  if (auction.count < 3) {
    auction.count++;
    auction.timeout = setTimeout(startCountdown, COUNTDOWN_TIME);
  } else {
    auction.active = false;
    channel.send(
      `🎉 **CHỐT ĐƠN**\n📦 **${auction.item}**\n💰 **${auction.price}**\n🏆 Người thắng: ${auction.bidder}`
    );
  }
}

/* ===== LOGIN ===== */
client.login(process.env.TOKEN);


