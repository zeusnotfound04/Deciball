import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("hello")
  .setDescription("Says hello to the user!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.user;
  await interaction.reply(`Hello, ${user.displayName}! 👋`);
}
