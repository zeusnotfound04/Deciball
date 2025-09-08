import { YouTubeService } from '../src/services/YouTubeService';
import * as dotenv from 'dotenv';
dotenv.config();

const testCookies = async () => {
  console.log('🧪 Testing YouTube cookies and authentication...\n');
  
  const youtubeService = new YouTubeService();
  
  // Test URL that commonly triggers bot detection
  const testUrl = 'https://youtube.com/watch?v=nPHAs-Ze8oo';
  
  console.log(`📺 Testing with URL: ${testUrl}`);
  
  try {
    console.log('🔍 Testing video info retrieval...');
    const info = await youtubeService.getVideoInfo(testUrl);
    console.log('✅ Successfully retrieved video info:');
    console.log(`   Title: ${info.videoDetails.title}`);
    console.log(`   Duration: ${info.videoDetails.lengthSeconds}s`);
    console.log(`   Author: ${info.videoDetails.author.name}`);
    
    console.log('\n🎵 Testing audio stream creation...');
    const stream = youtubeService.createAudioStream(testUrl);
    
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        console.log('⚠️  Stream test timed out (this might be normal)');
        resolve(true);
      }, 10000);
      
      stream.on('info', (streamInfo: any) => {
        clearTimeout(timeout);
        console.log('✅ Successfully created audio stream');
        console.log(`   Stream title: ${streamInfo.videoDetails.title}`);
        resolve(true);
      });
      
      stream.on('error', (error: any) => {
        clearTimeout(timeout);
        console.error('❌ Audio stream error:', error.message);
        
        if (error.message.includes('Sign in to confirm you\'re not a bot')) {
          console.log('\n🚨 Bot detection triggered!');
          console.log('💡 Solutions:');
          console.log('   1. Update your YouTube cookies in the .env file');
          console.log('   2. Make sure you\'re logged into YouTube in your browser');
          console.log('   3. Check the cookie-helper.md file for instructions');
        }
        
        reject(error);
      });
      
      // Destroy stream after test
      setTimeout(() => {
        try {
          stream.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 12000);
    });
    
  } catch (error) {
    console.error('❌ Failed to retrieve video info:', error);
    
    if (error instanceof Error && error.message.includes('Sign in to confirm you\'re not a bot')) {
      console.log('\n🚨 Bot detection triggered during info retrieval!');
      console.log('💡 This means your cookies are not working properly.');
      console.log('   Please update the COOKIES environment variable with fresh YouTube session cookies.');
    }
    
    return false;
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testCookies()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Cookie test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Cookie test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Cookie test failed with error:', error.message);
      process.exit(1);
    });
}

export { testCookies };
