import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Show the current music queue");

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
    const queue = player.getQueue();

    if (!currentTrack && queue.length === 0) {
      await interaction.reply({
        content: "📭 The queue is empty!",
        ephemeral: true
      });
      return;
    }

    let description = "";
    
    if (currentTrack) {
      description += `**🎵 Now Playing:**\n${currentTrack.title} by ${currentTrack.artist}\n\n`;
    }

    if (queue.length > 0) {
      description += "**📝 Up Next:**\n";
      queue.slice(0, 10).forEach((track, index) => {
        description += `${index + 1}. ${track.title} by ${track.artist}\n`;
      });

      if (queue.length > 10) {
        description += `\n... and ${queue.length - 10} more songs`;
      }
    }

    const embed = {
      color: 0x1db954,
      title: "🎵 Music Queue",
      description,
      footer: {
        text: `Total songs in queue: ${queue.length}`
      },
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in queue command:", error);
    await interaction.reply({
      content: "❌ An error occurred while fetching the queue.",
      ephemeral: true
    });
  }
}
