import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, AutocompleteInteraction } from "discord.js";
import { MusicManager } from "../services/MusicManager";
import { SpotifyService } from "../services/SpotifyService";
import { YouTubeService } from "../services/YouTubeService";

export const command = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song from Spotify, YouTube, or search by name")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("Song name, artist, Spotify link, or YouTube link")
      .setRequired(true)
      .setAutocomplete(true)
  ) as SlashCommandBuilder;

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if user is in a voice channel
    const member = interaction.member as GuildMember;
    if (!member?.voice?.channel) {
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
    if (!player.isConnected()) {
      const connected = await player.connect(member.voice.channel as any);
      if (!connected) {
        await interaction.editReply("❌ Failed to connect to voice channel! Please make sure I have permission to join and speak in your voice channel.");
        return;
      }
    }

    // Determine the type of input and handle accordingly
    let track = null;
    
    if (isSpotifyUrl(query)) {
      // Handle Spotify URL
      track = await handleSpotifyUrl(query, interaction.user.displayName, player);
    } else if (isYouTubeUrl(query)) {
      // Handle YouTube URL
      track = await handleYouTubeUrl(query, interaction.user.displayName, player);
    } else {
      // Handle search query
      track = await player.searchAndAddSpotifyTrack(query, interaction.user.displayName);
    }
    
    if (!track) {
      await interaction.editReply(`❌ No songs found for: "${query}"`);
      return;
    }

    // Add to queue and get position
    await player.addTrackToQueue(track);
    const queuePosition = player.getQueue().length + (player.getCurrentTrack() ? 0 : 1);
    const currentTrack = player.getCurrentTrack();
    
    const embed: any = {
      color: 0x1db954, // Spotify green
      title: currentTrack ? "🎵 Added to Queue" : "🎵 Now Playing",
      description: `**${track.title}**\nby ${track.artist}`,
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
          name: currentTrack ? "Queue Position" : "Status",
          value: currentTrack ? `${queuePosition}` : "Playing Now",
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Only add thumbnail if it exists
    if (track.thumbnail) {
      embed.thumbnail = { url: track.thumbnail };
    }

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
    const tracks = await spotifyService.searchTracks(focusedValue, 15);
    
    if (tracks.length === 0) {
      await interaction.respond([{
        name: `🔍 No results found for "${focusedValue}"`,
        value: focusedValue
      }]);
      return;
    }

    const choices = tracks.map(track => {
      const artistNames = track.artists.map((artist: any) => artist.name).join(', ');
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
      name: `🔍 Search for "${focusedValue}"`,
      value: focusedValue
    }]);
  }
}

// Helper functions for URL detection and handling
function isSpotifyUrl(url: string): boolean {
  return url.includes('spotify.com') || url.includes('open.spotify.com');
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

async function handleSpotifyUrl(url: string, requestedBy: string, player: any) {
  try {
    // For now, use the existing search method with the URL
    // This will be enhanced when we add proper Spotify URL parsing
    return await player.searchAndAddSpotifyTrack(url, requestedBy);
  } catch (error) {
    console.error('Error handling Spotify URL:', error);
    return null;
  }
}

async function handleYouTubeUrl(url: string, requestedBy: string, _player: any) {
  try {
    const youtubeService = new YouTubeService();
    
    // Validate YouTube URL
    if (!youtubeService.validateURL(url)) {
      console.error('Invalid YouTube URL');
      return null;
    }
    
    // Get video info
    const videoInfo = await youtubeService.getVideoInfo(url);
    if (!videoInfo) {
      console.error('Could not get YouTube video info');
      return null;
    }
    
    // Create track object from YouTube data
    const track = {
      title: videoInfo.videoDetails.title || 'Unknown Title',
      artist: videoInfo.videoDetails.author?.name || 'Unknown Artist',
      url: url,
      duration: formatDuration(parseInt(videoInfo.videoDetails.lengthSeconds) || 0),
      thumbnail: videoInfo.videoDetails.thumbnails?.[0]?.url || '',
      requestedBy: requestedBy,
      youtubeData: videoInfo
    };
    
    return track;
  } catch (error) {
    console.error('Error handling YouTube URL:', error);
    return null;
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
