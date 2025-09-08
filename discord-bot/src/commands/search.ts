import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, GuildMember, AutocompleteInteraction } from "discord.js";
import { SpotifyService } from "../services/SpotifyService";
import { MusicManager } from "../services/MusicManager";

export const command = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search for songs on Spotify and choose which one to play")
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
    if (!member?.voice?.channel) {
      await interaction.reply({
        content: "You need to be in a voice channel to play music!",
        ephemeral: true
      });
      return;
    }

    const query = interaction.options.getString("query", true);
    if (!query || query.trim().length === 0) {
      await interaction.reply({
        content: "Please provide a valid search query!",
        ephemeral: true
      });
      return;
    }

    const spotifyService = new SpotifyService();

    await interaction.deferReply();

    const tracks = await spotifyService.searchTracks(query.trim(), 10);
    
    if (tracks.length === 0) {
      await interaction.editReply(`No songs found for: "${query}"`);
      return;
    }

    // Create select menu options
    const options = tracks.slice(0, 10).map((track, index) => ({
      label: track.name.length > 100 ? track.name.substring(0, 97) + "..." : track.name,
      description: `by ${track.artists.map(a => a.name).join(", ")}`.length > 100 
        ? `by ${track.artists.map(a => a.name).join(", ")}`.substring(0, 97) + "..."
        : `by ${track.artists.map(a => a.name).join(", ")}`,
      value: index.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('search_select')
      .setPlaceholder('Choose a song to play...')
      .addOptions(options);

    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    // Create embed showing search results
    const embed = {
      color: 0x1db954,
      title: `🔍 Search Results for "${query}"`,
      description: `Found ${tracks.length} song${tracks.length === 1 ? '' : 's'}. Select one to play:`,
      fields: tracks.slice(0, 5).map((track, index) => ({
        name: `${index + 1}. ${track.name}`,
        value: `by ${track.artists.map(a => a.name).join(", ")}\nDuration: ${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`,
        inline: false
      })),
      footer: {
        text: tracks.length > 5 ? `... and ${tracks.length - 5} more results` : ''
      },
      timestamp: new Date().toISOString()
    };

    const response = await interaction.editReply({
      embeds: [embed],
      components: [actionRow]
    });

    // Wait for user selection
    try {
      const selectInteraction = await response.awaitMessageComponent({
        componentType: 3, // StringSelect component type
        time: 60000 // 1 minute timeout
      });

      if (!selectInteraction.isStringSelectMenu()) {
        await interaction.editReply({
          content: "Invalid interaction type!",
          embeds: [],
          components: []
        });
        return;
      }

      const selectedIndex = parseInt(selectInteraction.values[0] || "0");
      const selectedTrack = tracks[selectedIndex];

      if (!selectedTrack) {
        await interaction.editReply({
          content: "Invalid selection!",
          embeds: [],
          components: []
        });
        return;
      }

      await selectInteraction.deferUpdate();

      const musicManager = MusicManager.getInstance();
      const player = musicManager.getPlayer(interaction.guildId!);

      // Connect to voice channel if not already connected
      if (!player.isConnected()) {
        const connected = await player.connect(member.voice.channel as any);
        if (!connected) {
          await interaction.editReply({
            content: "Failed to connect to voice channel! Please make sure I have permission to join and speak in your voice channel.",
            embeds: [],
            components: []
          });
          return;
        }
      }

      // Convert Spotify track and search on YouTube
      const searchQuery = spotifyService.formatSearchQuery(selectedTrack);
      const track = await player.searchAndAddSpotifyTrack(searchQuery, interaction.user.displayName);
      
      if (!track) {
        await interaction.editReply({
          content: `Failed to find a playable version of "${selectedTrack.name}"`,
          embeds: [],
          components: []
        });
        return;
      }

      // Add to queue
      await player.addTrackToQueue(track);
      
      const successEmbed: any = {
        color: 0x1db954,
        title: "Added to Queue",
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
            name: "Queue Position",
            value: `${player.getQueue().length + (player.getCurrentTrack() ? 0 : 1)}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      // Only add thumbnail if it exists
      if (track.thumbnail) {
        successEmbed.thumbnail = { url: track.thumbnail };
      }

      await interaction.editReply({
        embeds: [successEmbed],
        components: []
      });

    } catch (error) {
      // Timeout or other error
      await interaction.editReply({
        content: "Search timed out. Please try again.",
        embeds: [],
        components: []
      });
    }

  } catch (error) {
    console.error("Error in search command:", error);
    
    const errorMessage = "An error occurred while searching for songs.";
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: errorMessage,
        embeds: [],
        components: []
      });
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
      console.warn('Spotify credentials not configured for autocomplete');
      await interaction.respond([{
        name: "Spotify autocomplete not available - missing credentials",
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
    console.error('Error in search autocomplete:', error);
    // Provide fallback option
    const focusedValue = interaction.options.getFocused();
    await interaction.respond([{
      name: `🔍 Search for "${focusedValue}"`,
      value: focusedValue
    }]);
  }
}
