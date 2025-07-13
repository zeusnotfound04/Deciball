require('dotenv').config();
const RPC = require('discord-rpc');

// Discord application client ID
const clientId = process.env.DISCORD_CLIENT_ID 

// Create client
let rpc = new RPC.Client({ transport: 'ipc' });

// Track connection state
let isConnected = false;
let reconnectInterval = null;
const RECONNECT_DELAY = 5000; // 5 seconds between reconnect attempts

// Activity queue for pending updates when disconnected
let pendingActivity = null;

/**
 * Initialize Discord RPC with reconnection handling
 */
function startDiscordRPC() {
    // Clear any existing reconnect interval
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
    
    // Set up event handlers
    setupEventHandlers();
    
    // Attempt initial connection
    connectToDiscord();
    
    // Set up reconnection interval to ensure we stay connected
    reconnectInterval = setInterval(() => {
        if (!isConnected) {
            console.log('Discord not connected, attempting reconnect...');
            // Create new client if needed
            if (!rpc || rpc.destroyed) {
                console.log('Creating new Discord RPC client');
                rpc = new RPC.Client({ transport: 'ipc' });
                setupEventHandlers();
            }
            connectToDiscord();
        }
    }, RECONNECT_DELAY);
}

/**
 * Set up event handlers for the RPC client
 */
function setupEventHandlers() {
    // Handle when connected
    rpc.on('ready', () => {
        console.log('✅ Discord RPC ready - Connected as', rpc.user.username);
        isConnected = true;
        
        // Apply any pending activity updates first
        if (pendingActivity) {
            applyPendingActivity();
        } else {
            // Otherwise show default activity
            setActivity("Choosing a song...", "Deciball Music");
        }
    });

    // Handle errors
    rpc.on('error', (error) => {
        console.error('❌ Discord RPC error:', error);
        isConnected = false;
    });
    
    // Handle disconnections
    rpc.on('disconnected', () => {
        console.log('❌ Discord RPC disconnected');
        isConnected = false;
    });
}

/**
 * Attempt to connect to Discord
 */
function connectToDiscord() {
    console.log('Attempting to connect to Discord...');
    
    try {
        rpc.login({ clientId })
            .then(() => console.log('Discord login successful'))
            .catch(error => {
                console.error('Discord login failed:', error);
                isConnected = false;
            });
    } catch (error) {
        console.error('Error during Discord login attempt:', error);
        isConnected = false;
    }
}

/**
 * Queue an activity update to be applied when connection is established
 */
function queueActivityUpdate(track, artist, options) {
    pendingActivity = { track, artist, options };
    console.log('Activity update queued for when Discord connects');
}

/**
 * Apply any pending activity updates
 */
function applyPendingActivity() {
    if (pendingActivity && isConnected) {
        console.log('Applying pending activity update');
        const { track, artist, options } = pendingActivity;
        pendingActivity = null;
        setActivity(track, artist, options);
    }
}

/**
 * Set Discord Rich Presence activity
 * @param {string} track The track name
 * @param {string} artist The artist name
 * @param {object} options Additional options
 * @returns {Promise<void>}
 */
function setActivity(track, artist, options = {}) {
    // Check if connected to Discord
    if (!isConnected) {
        console.warn('Cannot set Discord activity - not connected');
        // Queue this update to be applied when connection is established
        queueActivityUpdate(track, artist, options);
        return Promise.resolve();
    }

    console.log('Setting Discord activity:', { track, artist, options: { ...options, albumArt: options?.albumArt ? '(url omitted)' : undefined } });
    
    // For proper progress bar, we need to calculate timestamps correctly
    let startTimestamp, endTimestamp;
    
    // Check if song is paused
    const isPaused = options?.isPaused === true;
    
    if (isPaused) {
        // When paused, don't show timestamps (stops the progress bar)
        // But we do want to show the elapsed time, which Discord does by using
        // only the endTimestamp without startTimestamp
        startTimestamp = undefined;
        
        if (options?.currentTime !== undefined && options?.duration) {
            // Calculate how much time is left in the track (in milliseconds)
            const timeLeftMs = (options.duration - options.currentTime) * 1000;
            // Set endTimestamp to current time + remaining time
            // This shows "X:XX left" in Discord without an advancing progress bar
            endTimestamp = new Date(Date.now() + timeLeftMs);
        } else {
            // If we don't have timing info, don't show any timestamps
            endTimestamp = undefined;
        }
    } else if (options?.duration) {
        // Song is playing, show progressing timestamps
        // Current time in milliseconds
        const now = Date.now();
        
        // If we have a specific current position in the track
        if (options.currentTime !== undefined) {
            // Calculate when the song started (now - progress)
            startTimestamp = new Date(now - (options.currentTime * 1000));
            // Calculate when the song will end (start + duration)
            endTimestamp = new Date(startTimestamp.getTime() + (options.duration * 1000));
        } else if (options.startTime) {
            // If we have a specific start time
            startTimestamp = new Date(options.startTime);
            endTimestamp = new Date(startTimestamp.getTime() + (options.duration * 1000));
        } else {
            // Default: start now and end when the duration is over
            startTimestamp = new Date();
            endTimestamp = new Date(startTimestamp.getTime() + (options.duration * 1000));
        }
    } else {
        // If no duration, just show when started
        startTimestamp = options?.startTime ? new Date(options.startTime) : new Date();
        // No end timestamp if we don't know duration
        endTimestamp = undefined;
    }

    try {
        // Create activity payload
        const activity = {
            // If paused, show "Paused" prefix, otherwise just the track name
            details: isPaused ? `Paused - ${track}` : `${track}`, 
            state: `by ${artist}`, // Artist name
            // These two timestamps control the progress bar
            startTimestamp,
            endTimestamp,
            // Large image (album art)
            largeImageKey: options?.albumArt || 'deciball_logo',
            largeImageText: track ? `${track}` : 'Deciball Music',
            // Small image - show pause or play icon based on state
            // Note: You'll need to upload these icons to your Discord Developer Portal
            // If you haven't yet, you can use 'deciball_icon' as a fallback
            smallImageKey: 'deciball_icon', 
            smallImageText: isPaused 
                ? 'Paused' 
                : (options?.spaceName ? `Playing in ${options.spaceName}` : 'Deciball Music'),
            // Buttons (join session)
            buttons: options?.spaceId ? [
                { label: 'Join Session', url: `https://deciball.vercel.app/space/${options.spaceId}` }
            ] : undefined,
            instance: false,
        };
        
        console.log('Setting Discord activity with timestamps:', { 
            start: startTimestamp?.toISOString(),
            end: endTimestamp?.toISOString(),
            duration: options?.duration
        });
        
        rpc.setActivity(activity)
        .then(() => console.log('Discord activity set successfully'))
        .catch(error => console.error('Failed to set Discord activity:', error));
    } catch (error) {
        console.error('Error setting Discord activity:', error);
    }
}    /**
     * Clean up Discord RPC resources
     */
    function cleanupDiscordRPC() {
        // Clear reconnect interval
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        // Destroy RPC client if it exists
        if (rpc) {
            try {
                rpc.destroy();
                console.log('Discord RPC client destroyed');
            } catch (error) {
                console.error('Error destroying Discord RPC client:', error);
            }
        }
        
        isConnected = false;
    }
    
    module.exports = {
        startDiscordRPC,
        setActivity,
        cleanupDiscordRPC,
        isConnected: () => isConnected // Export connection status
    };
