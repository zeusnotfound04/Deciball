import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("debug")
  .setDescription("Show debug information about the music player");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const member = interaction.member as GuildMember;
    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);
    const status = player.getStatus();

    const embed = {
      color: 0x00ff00,
      title: "🔧 Debug Information",
      fields: [
        {
          name: "User Voice Channel",
          value: member.voice.channel ? `${member.voice.channel.name} (${member.voice.channel.id})` : "Not in voice channel",
          inline: false
        },
        {
          name: "Bot Connection Status",
          value: player.isConnected() ? "✅ Connected" : "❌ Not connected",
          inline: true
        },
        {
          name: "Player Status",
          value: status.isPlaying ? "🎵 Playing" : (status.isPaused ? "⏸️ Paused" : "⏹️ Stopped"),
          inline: true
        },
        {
          name: "Queue Length",
          value: status.queueLength.toString(),
          inline: true
        },
        {
          name: "Current Track",
          value: status.currentTrack ? `${status.currentTrack.title} by ${status.currentTrack.artist}` : "None",
          inline: false
        },
        {
          name: "Volume",
          value: `${Math.round(status.volume * 100)}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error("Error in debug command:", error);
    await interaction.reply({ 
      content: "❌ An error occurred while getting debug information.", 
      ephemeral: true 
    });
  }
}
