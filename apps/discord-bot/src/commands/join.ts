import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join your voice channel");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const member = interaction.member as GuildMember;
    
    if (!member.voice.channel) {
      await interaction.reply({
        content: "❌ You need to be in a voice channel for me to join!",
        ephemeral: true
      });
      return;
    }

    // Check if it's a voice channel (not stage channel)
    if (member.voice.channel.type !== 2) { // 2 = GUILD_VOICE
      await interaction.reply({
        content: "❌ I can only join voice channels, not stage channels!",
        ephemeral: true
      });
      return;
    }

    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);

    await interaction.deferReply();

    const connected = await player.connect(member.voice.channel as any);
    
    if (connected) {
      await interaction.editReply(`✅ Successfully joined **${member.voice.channel.name}**!`);
    } else {
      await interaction.editReply("❌ Failed to join voice channel! Please make sure I have permission to connect and speak in your voice channel.");
    }

  } catch (error) {
    console.error("Error in join command:", error);
    
    const errorMessage = "❌ An error occurred while trying to join the voice channel.";
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
