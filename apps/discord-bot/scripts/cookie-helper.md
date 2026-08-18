# YouTube Cookie Helper

## How to get YouTube cookies for bot authentication

When you encounter "Sign in to confirm you're not a bot" errors, you need to update your YouTube session cookies. Here's how:

### Method 1: Using Browser Developer Tools

1. **Open YouTube in your browser** and make sure you're logged in
2. **Open Developer Tools** (F12 or right-click → Inspect)
3. **Go to the Network tab**
4. **Refresh the page** (F5)
5. **Find a request to YouTube** (usually the first one to `www.youtube.com`)
6. **Right-click on the request** → Copy → Copy as cURL
7. **Extract the Cookie header** from the cURL command
8. **Update your .env file** with the new cookies

### Method 2: Using Browser Application Tab

1. **Open YouTube in your browser** and make sure you're logged in
2. **Open Developer Tools** (F12)
3. **Go to Application tab** (Chrome) or Storage tab (Firefox)
4. **Select Cookies** in the left sidebar
5. **Select youtube.com**
6. **Copy all cookie values** and format them as: `name1=value1; name2=value2; ...`
7. **Update your .env file** with the new cookies

### Important Notes:

- Cookies expire regularly (usually within 24-48 hours)
- Make sure you're logged into the same YouTube account
- Some cookies are critical for authentication: `SID`, `HSID`, `SSID`, `APISID`, `SAPISID`
- Keep your cookies secure and don't share them

### Testing:

After updating cookies, restart your Discord bot and test with a YouTube song to verify the fix.

### Environment Variable Format:

```env
COOKIES="cookie1=value1; cookie2=value2; cookie3=value3; ..."
```

Make sure to wrap the entire cookie string in quotes and separate each cookie with a semicolon and space.
