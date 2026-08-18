import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandUserOption } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Get information about a user")
  .addUserOption((option: SlashCommandUserOption) =>
    option
      .setName("target")
      .setDescription("The user to get info about")
      .setRequired(false)
  ) as SlashCommandBuilder;

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("target") || interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);

  const embed = {
    color: 0x0099ff,
    title: `User Information - ${targetUser.tag}`,
    thumbnail: {
      url: targetUser.displayAvatarURL({ size: 256 })
    },
    fields: [
      {
        name: "Username",
        value: targetUser.username,
        inline: true
      },
      {
        name: "User ID",
        value: targetUser.id,
        inline: true
      },
      {
        name: "Account Created",
        value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
        inline: false
      }
    ],
    timestamp: new Date().toISOString()
  };

  if (member) {
    embed.fields.push({
      name: "Joined Server",
      value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : "Unknown",
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}
