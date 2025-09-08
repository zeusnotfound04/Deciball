import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { MusicManager } from "../services/MusicManager";
import { SpaceManager } from "../services/SpaceManager";

export const command: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName("exit-space")
  .setDescription("Leave the current Deciball space");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const spaceManager = SpaceManager.getInstance();
    const currentSpace = spaceManager.getSpaceForGuild(interaction.guildId!);

    if (!currentSpace) {
      await interaction.reply({
        content: "❌ This server is not connected to any space!",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Leave the space
      await spaceManager.leaveSpace(interaction.guildId!);

      // Stop music and disconnect from voice
      const musicManager = MusicManager.getInstance();
      if (musicManager.hasPlayer(interaction.guildId!)) {
        const player = musicManager.getPlayer(interaction.guildId!);
        player.stop();
        player.disconnect();
        musicManager.removePlayer(interaction.guildId!);
      }

      const embed = {
        color: 0xff6b6b,
        title: "👋 Space Disconnected!",
        description: `Successfully left space: \`${currentSpace}\``,
        fields: [
          {
            name: "Status",
            value: "Disconnected from voice channel",
            inline: true
          }
        ],
        footer: {
          text: "Use /join-space to connect to another space"
        },
        timestamp: new Date().toISOString()
      };

      await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
      console.error("Error leaving space:", error);

      await interaction.editReply({
        content: "❌ Failed to leave space! Please try again."
      });
    }

  } catch (error) {
    console.error("Error in exit-space command:", error);
    
    const errorResponse = {
      content: "❌ An error occurred while leaving the space.",
      ephemeral: true
    };

    if (interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}
