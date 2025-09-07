import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current song");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const musicManager = MusicManager.getInstance();
    
    if (!musicManager.hasPlayer(interaction.guildId!)) {
      await interaction.reply({
        content: "❌ No music is currently playing!",
        ephemeral: true
      });
      return;
    }

    const player = musicManager.getPlayer(interaction.guildId!);
    const currentTrack = player.getCurrentTrack();
    
    if (!currentTrack) {
      await interaction.reply({
        content: "❌ No song is currently playing!",
        ephemeral: true
      });
      return;
    }

    const queue = player.getQueue();
    const nextTrack = queue.length > 0 ? queue[0] : null;
    
    const skipped = player.skip();
    
    if (skipped) {
      let responseMessage = `⏭️ Skipped: **${currentTrack.title}** by ${currentTrack.artist}`;
      
      if (nextTrack) {
        responseMessage += `\n\n🎵 Now playing: **${nextTrack.title}** by ${nextTrack.artist}`;
      } else {
        responseMessage += `\n\n📭 Queue is now empty`;
      }
      
      const embed = {
        color: 0xff6b35,
        title: "⏭️ Song Skipped",
        description: responseMessage,
        fields: [
          {
            name: "Remaining in Queue",
            value: `${queue.length - (nextTrack ? 1 : 0)} song${queue.length - (nextTrack ? 1 : 0) === 1 ? '' : 's'}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({
        content: "❌ Failed to skip the current song.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("Error in skip command:", error);
    await interaction.reply({
      content: "❌ An error occurred while skipping the song.",
      ephemeral: true
    });
  }
}
