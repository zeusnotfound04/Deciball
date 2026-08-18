import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply("Pong!");
}