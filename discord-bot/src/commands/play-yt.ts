import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("play-yt")
  .setDescription("Play a song directly from YouTube (for testing)")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("Song name to search on YouTube")
      .setRequired(true)
  ) as SlashCommandBuilder;

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if user is in a voice channel
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) {
      await interaction.reply({
        content: "❌ You need to be in a voice channel to play music!",
        ephemeral: true
      });
      return;
    }

    const query = interaction.options.getString("query", true);
    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);

    await interaction.deferReply();

    // Connect to voice channel
    console.log(`Attempting to connect to voice channel: ${member.voice.channel.name}`);
    const connected = await player.connect(member.voice.channel as any);
    if (!connected) {
      await interaction.editReply("❌ Failed to connect to voice channel!");
      return;
    }

    console.log(`✅ Connected, now searching YouTube for: "${query}"`);

    // Search directly on YouTube (bypassing Spotify)
    const youtubeService = (player as any).youtubeService;
    const youtubeTrack = await youtubeService.searchTrack(query);
    
    if (!youtubeTrack) {
      await interaction.editReply(`❌ No YouTube videos found for: "${query}"`);
      return;
    }

    console.log(`Found YouTube track: ${youtubeTrack.title}`);

    // Create track object
    const track = {
      title: youtubeTrack.title,
      artist: youtubeTrack.channelTitle,
      url: youtubeTrack.url,
      duration: youtubeTrack.duration,
      thumbnail: youtubeTrack.thumbnail,
      requestedBy: interaction.user.displayName,
      youtubeData: youtubeTrack
    };

    // Add to queue
    await player.addTrackToQueue(track);
    
    const embed = {
      color: 0xff0000, // YouTube red
      title: "🎵 Added to Queue (YouTube)",
      description: `**${track.title}**\nby ${track.artist}`,
      thumbnail: {
        url: track.thumbnail
      },
      fields: [
        {
          name: "Duration",
          value: track.duration,
          inline: true
        },
        {
          name: "Requested by",
          value: track.requestedBy,
          inline: true
        },
        {
          name: "Queue Position",
          value: `${player.getQueue().length + (player.getCurrentTrack() ? 0 : 1)}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in play-yt command:", error);
    
    const errorMessage = "❌ An error occurred while trying to play the song from YouTube.";
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
