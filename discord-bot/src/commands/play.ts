import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, AutocompleteInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";
import { SpotifyService } from "../services/SpotifyService";

export const command = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song from Spotify")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("Song name or artist")
      .setRequired(true)
      .setAutocomplete(true)
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

    // Check if it's a voice channel (not stage channel)
    if (member.voice.channel.type !== 2) { // 2 = GUILD_VOICE
      await interaction.reply({
        content: "❌ I can only play music in voice channels, not stage channels!",
        ephemeral: true
      });
      return;
    }

    const query = interaction.options.getString("query", true);
    const musicManager = MusicManager.getInstance();
    const player = musicManager.getPlayer(interaction.guildId!);

    await interaction.deferReply();

    // Connect to voice channel if not already connected
    const connected = await player.connect(member.voice.channel as any);
    if (!connected) {
      await interaction.editReply("❌ Failed to connect to voice channel!");
      return;
    }

    // Search for the track
    const track = await player.searchAndAddSpotifyTrack(query, interaction.user.displayName);
    
    if (!track) {
      await interaction.editReply(`❌ No songs found for: "${query}"`);
      return;
    }

    // Add to queue
    await player.addTrackToQueue(track);
    
    const embed = {
      color: 0x1db954, // Spotify green
      title: "🎵 Added to Queue",
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
    console.error("Error in play command:", error);
    
    const errorMessage = "❌ An error occurred while trying to play the song.";
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedValue = interaction.options.getFocused();
    
    // Only search if the user has typed at least 2 characters
    if (focusedValue.length < 2) {
      await interaction.respond([]);
      return;
    }

    // Check if Spotify credentials are available
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.warn('⚠️ Spotify credentials not configured for autocomplete');
      await interaction.respond([{
        name: "⚠️ Spotify autocomplete not available - missing credentials",
        value: focusedValue
      }]);
      return;
    }

    const spotifyService = new SpotifyService();
    const tracks = await spotifyService.searchTracks(focusedValue, 10);
    
    if (tracks.length === 0) {
      await interaction.respond([{
        name: `🔍 No results found for "${focusedValue}"`,
        value: focusedValue
      }]);
      return;
    }

    const choices = tracks.map(track => {
      const artistNames = track.artists.map(artist => artist.name).join(', ');
      const duration = Math.floor(track.duration_ms / 60000) + ':' + 
                      Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0');
      
      // Format: "Song Name - Artist (duration)"
      let name = `${track.name} - ${artistNames}`;
      if (name.length > 80) {
        name = name.substring(0, 77) + '...';
      }
      
      let value = `${track.name} ${artistNames}`;
      if (value.length > 100) {
        value = value.substring(0, 100);
      }
      
      return {
        name: `${name} (${duration})`,
        value: value
      };
    });

    await interaction.respond(choices);
  } catch (error) {
    console.error('Error in play autocomplete:', error);
    // Provide fallback option
    const focusedValue = interaction.options.getFocused();
    await interaction.respond([{
      name: `🎵 Search for "${focusedValue}"`,
      value: focusedValue
    }]);
  }
}
