import dotenv from "dotenv";
import YTMusic from "ytmusic-api";

const ytmusic = new YTMusic();
// dotenv.config(); 
// const readyYTMusic = (async () => {
//   try {
//     const cookies = process.env.COOKIES;
//     console.log("The Cookies 🐽🐽🐽🐽", cookies);

//     if (!cookies || cookies.trim() === "") {
//       throw new Error("COOKIES environment variable is not set.");
//     }

//     await ytmusic.initialize({ cookies });
//     console.log("[YTMusic] Initialization successful.");
//     return ytmusic;
//   } catch (error) {
//     console.error("[YTMusic] Initialization failed:", error);
//     throw error;
//   }
// })();

export default ytmusic;